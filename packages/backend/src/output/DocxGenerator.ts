import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
  BorderStyle,
  LevelFormat,
  convertInchesToTwip,
} from "docx";
import { marked, type Token, type Tokens } from "marked";
import type { StyleConfig } from "./TemplateLoader.js";

// ---------------------------------------------------------------------------
// Helpers — half-point conversion
// ---------------------------------------------------------------------------

/** The docx library expects font sizes in half-points (1 pt = 2 half-pts). */
function pt(size: number): number {
  return size * 2;
}

// ---------------------------------------------------------------------------
// Inline token → TextRun mapping
// ---------------------------------------------------------------------------

interface RunOptions {
  bold?: boolean;
  italics?: boolean;
  font?: string;
  size?: number;
}

/**
 * Recursively convert marked inline tokens (text, strong, em, codespan, etc.)
 * into an array of docx TextRun instances.
 */
function inlineTokensToRuns(
  tokens: Token[],
  baseOpts: RunOptions,
): TextRun[] {
  const runs: TextRun[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "strong": {
        const t = token as Tokens.Strong;
        runs.push(
          ...inlineTokensToRuns(t.tokens ?? [], {
            ...baseOpts,
            bold: true,
          }),
        );
        break;
      }
      case "em": {
        const t = token as Tokens.Em;
        runs.push(
          ...inlineTokensToRuns(t.tokens ?? [], {
            ...baseOpts,
            italics: true,
          }),
        );
        break;
      }
      case "codespan": {
        const t = token as Tokens.Codespan;
        runs.push(
          new TextRun({
            text: t.text,
            font: "Courier New",
            size: baseOpts.size,
            bold: baseOpts.bold,
            italics: baseOpts.italics,
          }),
        );
        break;
      }
      case "text": {
        const t = token as Tokens.Text;
        // A "text" token may itself contain child tokens (e.g. mixed bold)
        if ("tokens" in t && Array.isArray(t.tokens) && t.tokens.length > 0) {
          runs.push(...inlineTokensToRuns(t.tokens, baseOpts));
        } else {
          runs.push(
            new TextRun({
              text: t.text,
              font: baseOpts.font,
              size: baseOpts.size,
              bold: baseOpts.bold,
              italics: baseOpts.italics,
            }),
          );
        }
        break;
      }
      case "link": {
        const t = token as Tokens.Link;
        // Render link text (without hyperlink — keeps it simple and clean)
        runs.push(
          ...inlineTokensToRuns(t.tokens ?? [], baseOpts),
        );
        break;
      }
      case "br": {
        runs.push(new TextRun({ break: 1 }));
        break;
      }
      default: {
        // Fallback: render raw text if available
        if ("text" in token && typeof (token as { text: string }).text === "string") {
          runs.push(
            new TextRun({
              text: (token as { text: string }).text,
              font: baseOpts.font,
              size: baseOpts.size,
              bold: baseOpts.bold,
              italics: baseOpts.italics,
            }),
          );
        }
        break;
      }
    }
  }

  return runs;
}

// ---------------------------------------------------------------------------
// Block token → Paragraph mapping
// ---------------------------------------------------------------------------

function blockTokensToParagraphs(
  tokens: Token[],
  cfg: StyleConfig,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const token of tokens) {
    switch (token.type) {
      // -- Headings --------------------------------------------------------
      case "heading": {
        const t = token as Tokens.Heading;
        const isName = t.depth === 1;
        const fontSize = isName ? cfg.fontSize.name : cfg.fontSize.sectionHeading;
        const headingLevel = isName ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
        const spacing = isName
          ? { after: cfg.spacing.afterSection }
          : { after: cfg.spacing.afterSection, before: cfg.spacing.afterSection };

        paragraphs.push(
          new Paragraph({
            heading: headingLevel,
            alignment: isName ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing,
            children: inlineTokensToRuns(t.tokens ?? [], {
              font: cfg.fonts.heading,
              size: pt(fontSize),
              bold: true,
            }),
          }),
        );
        break;
      }

      // -- Paragraphs ------------------------------------------------------
      case "paragraph": {
        const t = token as Tokens.Paragraph;
        paragraphs.push(
          new Paragraph({
            spacing: { after: cfg.spacing.afterParagraph },
            children: inlineTokensToRuns(t.tokens ?? [], {
              font: cfg.fonts.body,
              size: pt(cfg.fontSize.body),
            }),
          }),
        );
        break;
      }

      // -- Lists -----------------------------------------------------------
      case "list": {
        const t = token as Tokens.List;
        for (const item of t.items) {
          // Each list item may contain child block tokens (paragraphs, sub-lists).
          // We flatten to inline runs for the first paragraph and indent.
          const itemRuns: TextRun[] = [];
          for (const child of item.tokens ?? []) {
            if (child.type === "text" || child.type === "paragraph") {
              const c = child as Tokens.Text | Tokens.Paragraph;
              itemRuns.push(
                ...inlineTokensToRuns(
                  "tokens" in c && Array.isArray(c.tokens) ? c.tokens : [],
                  {
                    font: cfg.fonts.body,
                    size: pt(cfg.fontSize.body),
                  },
                ),
              );
            }
          }

          paragraphs.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: cfg.spacing.afterParagraph },
              indent: { left: convertInchesToTwip(0.25) },
              children: itemRuns,
            }),
          );
        }
        break;
      }

      // -- Horizontal rules ------------------------------------------------
      case "hr": {
        paragraphs.push(
          new Paragraph({
            spacing: { after: cfg.spacing.afterSection },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999" },
            },
          }),
        );
        break;
      }

      // -- Spaces / empty blocks -------------------------------------------
      case "space": {
        // Skip pure whitespace tokens
        break;
      }

      // -- Fallback: try to render raw text --------------------------------
      default: {
        if ("text" in token && typeof (token as { text: string }).text === "string") {
          paragraphs.push(
            new Paragraph({
              spacing: { after: cfg.spacing.afterParagraph },
              children: [
                new TextRun({
                  text: (token as { text: string }).text,
                  font: cfg.fonts.body,
                  size: pt(cfg.fontSize.body),
                }),
              ],
            }),
          );
        }
        break;
      }
    }
  }

  return paragraphs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a markdown resume string into a professional DOCX buffer.
 *
 * Uses the `marked` lexer to tokenise the markdown and maps each block to
 * the corresponding `docx` paragraph / text-run with fonts, sizes, and
 * margins from the provided StyleConfig.
 */
export async function generateDocx(
  markdownContent: string,
  styleConfig: StyleConfig,
): Promise<Buffer> {
  const tokens = marked.lexer(markdownContent);
  const paragraphs = blockTokensToParagraphs(tokens, styleConfig);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: styleConfig.margins.top,
              bottom: styleConfig.margins.bottom,
              left: styleConfig.margins.left,
              right: styleConfig.margins.right,
            },
          },
        },
        children: paragraphs,
      },
    ],
    numbering: {
      config: [
        {
          reference: "default-bullet",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.5),
                    hanging: convertInchesToTwip(0.25),
                  },
                },
              },
            },
          ],
        },
      ],
    },
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
