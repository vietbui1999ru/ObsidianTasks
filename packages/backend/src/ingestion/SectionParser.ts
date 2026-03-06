import { Lexer, type Token, type Tokens } from "marked";
import type {
  VaultEducation,
  VaultExperience,
  VaultProject,
  VaultSkill,
} from "@obsidian-tasks/shared";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single resume variant parsed from a `# Resume Target: {role}` block. */
export interface ResumeVariant {
  targetRole: string;
  summary?: string;
  skills: VaultSkill[];
  experiences: VaultExperience[];
  projects: VaultProject[];
}

/** Partial vault data extracted from section headings within a single file. */
export interface SectionData {
  profileName?: string;
  summary?: string;
  skills: VaultSkill[];
  experiences: VaultExperience[];
  projects: VaultProject[];
  education: VaultEducation[];
  variants: ResumeVariant[];
}

// ---------------------------------------------------------------------------
// Heading matchers (case-insensitive)
// ---------------------------------------------------------------------------

type SectionKind =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education";

const SECTION_PATTERNS: Record<SectionKind, RegExp> = {
  summary: /^(summary|about|overview|profile)$/i,
  skills: /^(skills|technologies|tech stack|competencies|technical skills)$/i,
  experience:
    /^(experience|work experience|employment|work history|professional experience)$/i,
  projects: /^(projects|portfolio|selected projects)$/i,
  education: /^(education|academic|qualifications)$/i,
};

function classifyHeading(text: string): SectionKind | null {
  const trimmed = text.trim();
  for (const [kind, re] of Object.entries(SECTION_PATTERNS)) {
    if (re.test(trimmed)) return kind as SectionKind;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Middle dot separator used in the user's vault format (U+00B7). */
const MIDDLE_DOT = "\u00B7";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Given a flat token stream, slice tokens that fall under a depth-3+ heading
 * until the next heading of equal or lesser depth.
 * Used as a FALLBACK for the old `### Subsection` format.
 */
interface SubSection {
  heading: string;
  tokens: Token[];
}

function extractSubSections(tokens: Token[]): SubSection[] {
  const sections: SubSection[] = [];
  let current: SubSection | null = null;

  for (const token of tokens) {
    if (token.type === "heading" && (token as Tokens.Heading).depth >= 3) {
      if (current) sections.push(current);
      current = { heading: (token as Tokens.Heading).text, tokens: [] };
    } else if (current) {
      current.tokens.push(token);
    }
  }
  if (current) sections.push(current);
  return sections;
}

/** Extract bullet list items from a sequence of tokens. */
function extractBullets(tokens: Token[]): string[] {
  const items: string[] = [];
  for (const token of tokens) {
    if (token.type === "list") {
      for (const item of (token as Tokens.List).items) {
        const text = item.text.trim();
        if (text) items.push(text);
      }
    }
  }
  return items;
}

/** Collect paragraph text from tokens. */
function collectParagraphs(tokens: Token[]): string {
  return tokens
    .filter((t) => t.type === "paragraph" || t.type === "text")
    .map(
      (t) =>
        (t as Tokens.Paragraph).text ?? (t as Tokens.Text).text ?? "",
    )
    .join("\n")
    .trim();
}

/**
 * Strip markdown bold/italic markers from text.
 * e.g., `**Role** \u00B7 _Dates_` -> `Role \u00B7 Dates`
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/<em>(.+?)<\/em>/g, "$1")
    .replace(/<strong>(.+?)<\/strong>/g, "$1")
    .trim();
}

// ---------------------------------------------------------------------------
// Experience entry line detection
// ---------------------------------------------------------------------------

/**
 * Detects if a paragraph's raw text is an experience header line:
 * `**Role** \u00B7 Company \u00B7 Location \u00B7 _Dates_`
 *
 * Returns parsed fields or null if it doesn't match.
 */
interface ExperienceHeader {
  role: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
}

function parseExperienceHeaderLine(rawText: string): ExperienceHeader | null {
  // The line should contain at least two middle dot separators and
  // have a bold role name at the start.
  if (!rawText.includes(MIDDLE_DOT)) return null;

  // Check for bold prefix pattern: **Something**
  const boldRoleMatch = rawText.match(/^\*\*(.+?)\*\*/);
  if (!boldRoleMatch) return null;

  const role = boldRoleMatch[1].trim();

  // Split the rest by middle dot
  const afterRole = rawText.slice(boldRoleMatch[0].length);
  const parts = afterRole
    .split(MIDDLE_DOT)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;

  // Last part should contain dates (wrapped in _italics_ or <em>)
  const lastPart = parts[parts.length - 1];
  const dateStr = stripMarkdown(lastPart);
  const dates = parseDateRange(dateStr);

  if (!dates.start) return null;

  const company = stripMarkdown(parts[0]);
  const location =
    parts.length >= 3 ? stripMarkdown(parts[parts.length - 2]) : undefined;

  return {
    role,
    company,
    location,
    startDate: dates.start,
    endDate: dates.end,
  };
}

// ---------------------------------------------------------------------------
// Project entry line detection
// ---------------------------------------------------------------------------

/**
 * Detects if a paragraph's raw text is a project header line:
 * `**Title** \u00B7 _Tech Stack_ \u00B7 Dates`
 */
interface ProjectHeader {
  title: string;
  techStack: string[];
  startDate?: string;
  endDate?: string;
}

function parseProjectHeaderLine(rawText: string): ProjectHeader | null {
  if (!rawText.includes(MIDDLE_DOT)) return null;

  const boldTitleMatch = rawText.match(/^\*\*(.+?)\*\*/);
  if (!boldTitleMatch) return null;

  const title = boldTitleMatch[1].trim();

  const afterTitle = rawText.slice(boldTitleMatch[0].length);
  const parts = afterTitle
    .split(MIDDLE_DOT)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length < 1) return null;

  // Find the part that looks like a tech stack (wrapped in _italics_)
  let techStack: string[] = [];
  let startDate: string | undefined;
  let endDate: string | undefined;

  for (const part of parts) {
    // Check if part is italic (tech stack): _content_
    const italicMatch = part.match(/^_(.+?)_$/);
    if (italicMatch) {
      // Tech stack is comma-separated within italics
      techStack = italicMatch[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      // Try to parse as dates
      const dates = parseDateRange(stripMarkdown(part));
      if (dates.start) {
        startDate = dates.start;
        endDate = dates.end;
      }
    }
  }

  return { title, techStack, startDate, endDate };
}

// ---------------------------------------------------------------------------
// Date extraction
// ---------------------------------------------------------------------------

interface DateRange {
  start?: string;
  end?: string;
}

const DATE_RANGE_RE =
  /(\w+\.?\s*\d{4}|\d{4}(?:-\d{2})?)\s*[-\u2013]\s*(\w+\.?\s*\d{4}|\d{4}(?:-\d{2})?|[Pp]resent|[Cc]urrent|[Nn]ow)/;

const SINGLE_DATE_RE = /(\w+\.?\s*\d{4}|\d{4}(?:-\d{2})?)/;

function parseDateRange(text: string): DateRange {
  const rangeMatch = text.match(DATE_RANGE_RE);
  if (rangeMatch) {
    return { start: rangeMatch[1].trim(), end: rangeMatch[2].trim() };
  }

  const singleMatch = text.match(SINGLE_DATE_RE);
  if (singleMatch) {
    return { start: singleMatch[1].trim() };
  }

  return {};
}

/**
 * Searches token text and heading for date patterns.
 * Used by the fallback (old ###-based) parsers.
 */
function extractDates(tokens: Token[], heading: string): DateRange {
  const headingMatch = heading.match(DATE_RANGE_RE);
  if (headingMatch) {
    return { start: headingMatch[1].trim(), end: headingMatch[2].trim() };
  }

  for (const token of tokens) {
    const text =
      (token as Tokens.Paragraph).text ??
      (token as Tokens.Text).text ??
      token.raw ??
      "";
    const match = text.match(DATE_RANGE_RE);
    if (match) {
      return { start: match[1].trim(), end: match[2].trim() };
    }
  }

  for (const token of tokens) {
    const text =
      (token as Tokens.Paragraph).text ??
      (token as Tokens.Text).text ??
      "";
    const match = text.match(SINGLE_DATE_RE);
    if (match) {
      return { start: match[1].trim() };
    }
  }

  return {};
}

function extractLocation(tokens: Token[]): string | undefined {
  for (const token of tokens) {
    const text =
      (token as Tokens.Paragraph).text ??
      (token as Tokens.Text).text ??
      "";
    const match = text.match(/(?:location|based in|remote)\s*:?\s*(.+)/i);
    if (match) return match[1].trim();
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Section parsers
// ---------------------------------------------------------------------------

function parseSummary(tokens: Token[]): string {
  const paragraphs = collectParagraphs(tokens);
  const bullets = extractBullets(tokens);
  return [paragraphs, ...bullets].filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// Skills parser (new format: **Category:** comma-separated values)
// ---------------------------------------------------------------------------

/**
 * Parse skills from tokens.
 *
 * NEW FORMAT: `**Category:** value1, value2, value3 **Category2:** ...`
 *   All on one or a few lines. We split on `**Category:**` boundaries.
 *
 * FALLBACK: bullet lists and comma-separated paragraphs (old format).
 */
function parseSkills(tokens: Token[]): VaultSkill[] {
  const skills: VaultSkill[] = [];
  const seen = new Set<string>();

  function addSkill(name: string, category?: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    skills.push({ name: trimmed, category });
  }

  // Collect all raw text from paragraphs
  const allRawText: string[] = [];
  for (const token of tokens) {
    if (token.type === "paragraph") {
      allRawText.push(token.raw ?? "");
    }
  }
  const combinedRaw = allRawText.join(" ");

  // Try new format: **Category:** values
  // Split on **Category:** pattern, keeping the category name
  const categoryPattern = /\*\*([^*]+?):\*\*\s*/g;
  const categoryMatches = [...combinedRaw.matchAll(categoryPattern)];

  if (categoryMatches.length > 0) {
    // New format detected
    for (let i = 0; i < categoryMatches.length; i++) {
      const category = categoryMatches[i][1].trim();
      const startIdx =
        categoryMatches[i].index! + categoryMatches[i][0].length;
      const endIdx =
        i + 1 < categoryMatches.length
          ? categoryMatches[i + 1].index!
          : combinedRaw.length;
      const valuesStr = combinedRaw.slice(startIdx, endIdx).trim();

      // Split on commas, stripping any trailing markdown/whitespace
      for (const part of valuesStr.split(",")) {
        const clean = part
          .replace(/\*\*/g, "")
          .replace(/\n/g, " ")
          .trim();
        addSkill(clean, category);
      }
    }
    return skills;
  }

  // FALLBACK: old format (bullet lists, comma-separated paragraphs)
  for (const bullet of extractBullets(tokens)) {
    for (const part of bullet.split(/[,;]/)) {
      const name = part.replace(/\*\*/g, "").trim();
      addSkill(name);
    }
  }

  for (const token of tokens) {
    if (token.type === "paragraph") {
      const text = (token as Tokens.Paragraph).text;
      for (const part of text.split(/[,;]/)) {
        const name = part.replace(/\*\*/g, "").trim();
        addSkill(name);
      }
    }
  }

  return skills;
}

// ---------------------------------------------------------------------------
// Experience parser (new format: bold-line + bullets, no ### headings)
// ---------------------------------------------------------------------------

/**
 * Parse experience entries.
 *
 * NEW FORMAT: Each entry is a paragraph line
 *   `**Role** \u00B7 Company \u00B7 Location \u00B7 _Dates_`
 * followed by a bullet list, until the next such line.
 *
 * FALLBACK: `### Heading` subsections (old format).
 */
function parseExperience(tokens: Token[]): VaultExperience[] {
  // First try: scan for bold-line entries (new format)
  const newFormatEntries = parseExperienceNewFormat(tokens);
  if (newFormatEntries.length > 0) return newFormatEntries;

  // Fallback: old ### subsection format
  return parseExperienceFallback(tokens);
}

function parseExperienceNewFormat(tokens: Token[]): VaultExperience[] {
  const entries: VaultExperience[] = [];

  // Walk tokens looking for paragraphs that match the experience header pattern,
  // then collect bullet lists that follow until the next header paragraph.
  let currentHeader: ExperienceHeader | null = null;
  let currentBullets: string[] = [];

  function flush() {
    if (currentHeader) {
      entries.push({
        company: currentHeader.company,
        role: currentHeader.role,
        startDate: currentHeader.startDate,
        endDate: currentHeader.endDate,
        bullets: currentBullets,
        location: currentHeader.location,
      });
    }
    currentHeader = null;
    currentBullets = [];
  }

  for (const token of tokens) {
    if (token.type === "paragraph") {
      // The paragraph raw text may contain the header pattern.
      // marked can merge multiple lines into one paragraph,
      // so we check each line of the raw text.
      const rawText = (token.raw ?? "").trim();
      const lines = rawText.split("\n");

      for (const line of lines) {
        const trimmedLine = line.trim();
        const header = parseExperienceHeaderLine(trimmedLine);
        if (header) {
          flush();
          currentHeader = header;
        }
      }
    } else if (token.type === "list" && currentHeader) {
      // Collect bullets for the current entry
      for (const item of (token as Tokens.List).items) {
        const text = item.text.trim();
        if (text) currentBullets.push(text);
      }
    }
  }
  flush();

  return entries;
}

function parseExperienceFallback(tokens: Token[]): VaultExperience[] {
  const subs = extractSubSections(tokens);
  return subs.map((sub) => {
    const { company, role } = parseCompanyRole(sub.heading);
    const bullets = extractBullets(sub.tokens);
    const dates = extractDates(sub.tokens, sub.heading);
    const location = extractLocation(sub.tokens);

    return {
      company,
      role,
      startDate: dates.start ?? "Unknown",
      endDate: dates.end,
      bullets,
      location,
    };
  });
}

// ---------------------------------------------------------------------------
// Projects parser (new format: bold-line + bullets, no ### headings)
// ---------------------------------------------------------------------------

/**
 * Parse project entries.
 *
 * NEW FORMAT: Each entry is a paragraph line
 *   `**Title** \u00B7 _Tech Stack_ \u00B7 Dates`
 * followed by a bullet list.
 *
 * FALLBACK: `### Heading` subsections (old format).
 */
function parseProjects(tokens: Token[]): VaultProject[] {
  const newFormatEntries = parseProjectsNewFormat(tokens);
  if (newFormatEntries.length > 0) return newFormatEntries;

  return parseProjectsFallback(tokens);
}

function parseProjectsNewFormat(tokens: Token[]): VaultProject[] {
  const entries: VaultProject[] = [];

  let currentHeader: ProjectHeader | null = null;
  let currentBullets: string[] = [];

  function flush() {
    if (currentHeader) {
      entries.push({
        title: currentHeader.title,
        description: currentBullets.join("\n") || currentHeader.title,
        techStack: currentHeader.techStack,
        tags: [],
        startDate: currentHeader.startDate,
        endDate: currentHeader.endDate,
      });
    }
    currentHeader = null;
    currentBullets = [];
  }

  for (const token of tokens) {
    if (token.type === "paragraph") {
      const rawText = (token.raw ?? "").trim();
      const lines = rawText.split("\n");

      for (const line of lines) {
        const trimmedLine = line.trim();
        const header = parseProjectHeaderLine(trimmedLine);
        if (header) {
          flush();
          currentHeader = header;
        }
      }
    } else if (token.type === "list" && currentHeader) {
      for (const item of (token as Tokens.List).items) {
        const text = item.text.trim();
        if (text) currentBullets.push(text);
      }
    }
  }
  flush();

  return entries;
}

function parseProjectsFallback(tokens: Token[]): VaultProject[] {
  const subs = extractSubSections(tokens);
  return subs.map((sub) => {
    const title = sub.heading.trim();
    const description = collectParagraphs(sub.tokens);
    const bullets = extractBullets(sub.tokens);

    const techStack: string[] = [];
    const tags: string[] = [];
    const regularBullets: string[] = [];

    for (const b of bullets) {
      if (/^(tech|stack|technologies|tools)\s*:/i.test(b)) {
        const items = b.replace(/^[^:]+:\s*/, "").split(/[,;]/);
        techStack.push(...items.map((s) => s.trim()).filter(Boolean));
      } else if (/^(tags?|categories?|keywords?)\s*:/i.test(b)) {
        const items = b.replace(/^[^:]+:\s*/, "").split(/[,;]/);
        tags.push(...items.map((s) => s.trim()).filter(Boolean));
      } else {
        regularBullets.push(b);
      }
    }

    if (techStack.length === 0) {
      const codePattern = /`([^`]+)`/g;
      const allText = [description, ...regularBullets].join(" ");
      let match: RegExpExecArray | null;
      while ((match = codePattern.exec(allText)) !== null) {
        techStack.push(match[1]);
      }
    }

    const fullDescription = [description, ...regularBullets]
      .filter(Boolean)
      .join("\n");

    return {
      title,
      description: fullDescription || title,
      techStack,
      tags,
    };
  });
}

// ---------------------------------------------------------------------------
// Education parser (new format: blockquote with degree patterns)
// ---------------------------------------------------------------------------

/**
 * Parse education from tokens.
 *
 * NEW FORMAT: A blockquote like:
 *   `> **Education block (static \u2014 every resume):** M.S. Computer Science \u2014 University of Dayton \u00B7 Aug. 2023 \u2013 Dec. 2025 B.A. Applied Mathematics...`
 *
 * FALLBACK: `### Heading` subsections (old format).
 */
function parseEducation(tokens: Token[]): VaultEducation[] {
  // Try new format from blockquotes anywhere in the token stream
  const fromBlockquote = parseEducationFromBlockquotes(tokens);
  if (fromBlockquote.length > 0) return fromBlockquote;

  // Fallback: old ### subsection format
  return parseEducationFallback(tokens);
}

function parseEducationFromBlockquotes(tokens: Token[]): VaultEducation[] {
  const entries: VaultEducation[] = [];

  for (const token of tokens) {
    if (token.type === "blockquote") {
      const raw = token.raw ?? "";
      const text = raw
        .replace(/^>\s*/gm, "")
        .replace(/\*\*[^*]*?\*\*:?\s*/g, "") // Strip bold labels
        .trim();

      if (!text) continue;

      // Split on degree patterns
      const degreePattern =
        /(?:M\.S\.|B\.A\.|B\.S\.|Ph\.D\.|M\.A\.|MBA|Bachelor(?:'s)?|Master(?:'s)?|Doctor(?:ate)?|Associate(?:'s)?)/g;
      const degreeMatches = [...text.matchAll(degreePattern)];

      if (degreeMatches.length === 0) continue;

      for (let i = 0; i < degreeMatches.length; i++) {
        const degree = degreeMatches[i][0];
        const startIdx = degreeMatches[i].index!;
        const endIdx =
          i + 1 < degreeMatches.length
            ? degreeMatches[i + 1].index!
            : text.length;

        const entryText = text.slice(startIdx, endIdx).trim();

        // Parse the entry: "M.S. Computer Science \u2014 University of Dayton \u00B7 Aug. 2023 \u2013 Dec. 2025"
        // or: "B.A. Applied Mathematics, Double Major in Computer Science \u2014 Augustana College \u00B7 Aug. 2019 \u2013 May 2023"

        // Remove the degree prefix to get "Computer Science \u2014 University..."
        const afterDegree = entryText.slice(degree.length).trim();

        // Split on em-dash (\u2014) or " - " to separate field from institution
        const dashParts = afterDegree.split(/\s*[\u2014]\s*|\s+[-]\s+/);

        let field: string | undefined;
        let institution = "";
        let startDate: string | undefined;
        let endDate: string | undefined;

        if (dashParts.length >= 2) {
          // First part is the field, rest has institution and dates
          field = dashParts[0].trim().replace(/^,\s*/, "") || undefined;
          const rest = dashParts.slice(1).join(" ").trim();

          // Split on middle dot to separate institution from dates
          if (rest.includes(MIDDLE_DOT)) {
            const dotParts = rest.split(MIDDLE_DOT);
            institution = dotParts[0].trim();
            const dateStr = dotParts.slice(1).join(" ").trim();
            const dates = parseDateRange(dateStr);
            startDate = dates.start;
            endDate = dates.end;
          } else {
            // Try to extract dates from the rest
            const dates = parseDateRange(rest);
            institution = rest
              .replace(DATE_RANGE_RE, "")
              .replace(SINGLE_DATE_RE, "")
              .trim();
            startDate = dates.start;
            endDate = dates.end;
          }
        } else {
          // Single chunk: try to extract what we can
          field = afterDegree || undefined;
          institution = "Unknown";
        }

        entries.push({
          institution: institution || "Unknown",
          degree,
          field,
          startDate,
          endDate,
        });
      }
    }
  }

  return entries;
}

function parseEducationFallback(tokens: Token[]): VaultEducation[] {
  const subs = extractSubSections(tokens);
  return subs.map((sub) => {
    const { institution, degree, field } = parseInstitutionDegree(sub.heading);
    const paragraphs = collectParagraphs(sub.tokens);
    const bullets = extractBullets(sub.tokens);

    let gpa: string | undefined;
    for (const text of [paragraphs, ...bullets]) {
      const gpaMatch = text.match(/gpa\s*:?\s*([\d.]+\s*\/?\s*[\d.]*)/i);
      if (gpaMatch) {
        gpa = gpaMatch[1].trim();
        break;
      }
    }

    let resolvedDegree = degree;
    const resolvedField = field;
    if (!resolvedDegree) {
      for (const text of [paragraphs, ...bullets]) {
        const degreeMatch = text.match(
          /(?:^|\n)\s*((?:B\.?S\.?|M\.?S\.?|Ph\.?D\.?|Bachelor|Master|Doctor|Associate|MBA|B\.?A\.?|M\.?A\.?)[^,\n]*)/i,
        );
        if (degreeMatch) {
          resolvedDegree = degreeMatch[1].trim();
          break;
        }
      }
    }

    const dates = extractDates(sub.tokens, sub.heading);

    return {
      institution,
      degree: resolvedDegree || "Unknown",
      field: resolvedField,
      startDate: dates.start,
      endDate: dates.end,
      gpa,
    };
  });
}

// ---------------------------------------------------------------------------
// Heading parsing helpers (used by fallback parsers)
// ---------------------------------------------------------------------------

function parseCompanyRole(heading: string): { company: string; role: string } {
  const separatorMatch = heading.match(/^(.+?)\s*[-|]\s*(.+)$/);
  if (separatorMatch) {
    return {
      company: separatorMatch[1].trim(),
      role: separatorMatch[2].trim(),
    };
  }

  const atMatch = heading.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    return { company: atMatch[2].trim(), role: atMatch[1].trim() };
  }

  return { company: heading.trim(), role: "Unknown" };
}

function parseInstitutionDegree(heading: string): {
  institution: string;
  degree: string;
  field?: string;
} {
  const separatorMatch = heading.match(/^(.+?)\s*[-|]\s*(.+)$/);
  if (separatorMatch) {
    const left = separatorMatch[1].trim();
    const right = separatorMatch[2].trim();
    if (
      /^(B\.?S\.?|M\.?S\.?|Ph\.?D\.?|Bachelor|Master|Doctor|Associate|MBA|B\.?A\.?|M\.?A\.?)/i.test(
        left,
      )
    ) {
      return { degree: left, institution: right };
    }
    return { institution: left, degree: right };
  }

  const inMatch = heading.match(/^(.+?)\s+in\s+(.+)$/i);
  if (inMatch) {
    return {
      institution: heading.trim(),
      degree: inMatch[1].trim(),
      field: inMatch[2].trim(),
    };
  }

  return { institution: heading.trim(), degree: "" };
}

// ---------------------------------------------------------------------------
// Profile name extraction
// ---------------------------------------------------------------------------

/**
 * Extract profile name from the first `# heading` in the document.
 * Handles formats like:
 *   - `# Viet Bui \u2014 Resume Variants by Role Type`
 *   - `# John Doe`
 */
function extractProfileName(tokens: Token[]): string | undefined {
  for (const token of tokens) {
    if (token.type === "heading" && (token as Tokens.Heading).depth === 1) {
      const text = (token as Tokens.Heading).text.trim();

      // Skip "Resume Target:" variant headings
      if (/^resume\s+target\s*:/i.test(text)) continue;

      // Strip suffix after em-dash or pipe
      const cleaned = text
        .split(/\s*[\u2014|]\s*/)[0]
        .trim();

      if (cleaned) return cleaned;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Resume variant splitting
// ---------------------------------------------------------------------------

/**
 * Split a token stream on `# Resume Target: {role}` headings.
 * Returns an array of { targetRole, tokens } for each variant found.
 */
interface VariantBlock {
  targetRole: string;
  tokens: Token[];
}

function splitVariants(tokens: Token[]): VariantBlock[] {
  const variants: VariantBlock[] = [];
  let current: VariantBlock | null = null;

  for (const token of tokens) {
    if (token.type === "heading" && (token as Tokens.Heading).depth === 1) {
      const text = (token as Tokens.Heading).text.trim();
      const variantMatch = text.match(/^resume\s+target\s*:\s*(.+)$/i);
      if (variantMatch) {
        current = { targetRole: variantMatch[1].trim(), tokens: [] };
        variants.push(current);
        continue;
      }
    }

    if (current) {
      current.tokens.push(token);
    }
  }

  return variants;
}

/**
 * Parse a single variant's tokens into a ResumeVariant.
 * This reuses the same section-grouping logic as the main parser.
 */
function parseVariantTokens(
  targetRole: string,
  tokens: Token[],
): ResumeVariant {
  const variant: ResumeVariant = {
    targetRole,
    skills: [],
    experiences: [],
    projects: [],
  };

  type Group = { kind: SectionKind; tokens: Token[] };
  const groups: Group[] = [];
  let currentGroup: Group | null = null;

  for (const token of tokens) {
    if (token.type === "heading") {
      const heading = token as Tokens.Heading;
      if (heading.depth === 2) {
        const kind = classifyHeading(heading.text);
        if (kind) {
          currentGroup = { kind, tokens: [] };
          groups.push(currentGroup);
          continue;
        }
        currentGroup = null;
        continue;
      }
    }
    if (currentGroup) {
      currentGroup.tokens.push(token);
    }
  }

  for (const group of groups) {
    switch (group.kind) {
      case "summary":
        variant.summary = parseSummary(group.tokens);
        break;
      case "skills":
        variant.skills = parseSkills(group.tokens);
        break;
      case "experience":
        variant.experiences = parseExperience(group.tokens);
        break;
      case "projects":
        variant.projects = parseProjects(group.tokens);
        break;
      // education is static, handled at document level
    }
  }

  return variant;
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

/**
 * Tokenises the markdown body (frontmatter already stripped) and extracts
 * structured data from recognised `## Section` headings.
 *
 * Supports two formats:
 *   1. NEW: `# Resume Target: {role}` variants with `**Bold** \u00B7 info \u00B7 _dates_` entries
 *   2. OLD: `## Section` -> `### Subsection` hierarchy
 *
 * Also extracts:
 *   - Profile name from the first `# heading`
 *   - Education from blockquote `> **Education block...:** ...`
 *   - Resume variants split on `# Resume Target: {role}`
 */
export function parseSections(body: string): SectionData {
  const result: SectionData = {
    skills: [],
    experiences: [],
    projects: [],
    education: [],
    variants: [],
  };

  if (!body || !body.trim()) return result;

  const tokens = Lexer.lex(body);

  // --- Extract profile name from first # heading ---
  result.profileName = extractProfileName(tokens);

  // --- Extract education from blockquotes (document-level, outside variants) ---
  result.education = parseEducationFromBlockquotes(tokens);

  // --- Split into resume variants ---
  const variantBlocks = splitVariants(tokens);

  if (variantBlocks.length > 0) {
    // Multi-variant document
    result.variants = variantBlocks.map((vb) =>
      parseVariantTokens(vb.targetRole, vb.tokens),
    );

    // Default data comes from the first variant
    const first = result.variants[0];
    result.summary = first.summary;
    result.skills = first.skills;
    result.experiences = first.experiences;
    result.projects = first.projects;
  } else {
    // Single-document format (no variants): parse ## sections directly
    type Group = { kind: SectionKind; tokens: Token[] };
    const groups: Group[] = [];
    let currentGroup: Group | null = null;

    for (const token of tokens) {
      if (token.type === "heading") {
        const heading = token as Tokens.Heading;
        if (heading.depth === 2) {
          const kind = classifyHeading(heading.text);
          if (kind) {
            currentGroup = { kind, tokens: [] };
            groups.push(currentGroup);
            continue;
          }
          currentGroup = null;
          continue;
        }
      }
      if (currentGroup) {
        currentGroup.tokens.push(token);
      }
    }

    for (const group of groups) {
      switch (group.kind) {
        case "summary":
          result.summary = parseSummary(group.tokens);
          break;
        case "skills":
          result.skills = parseSkills(group.tokens);
          break;
        case "experience":
          result.experiences = parseExperience(group.tokens);
          break;
        case "projects":
          result.projects = parseProjects(group.tokens);
          break;
        case "education":
          // Only use section-based education if blockquote parsing found nothing
          if (result.education.length === 0) {
            result.education = parseEducation(group.tokens);
          }
          break;
      }
    }
  }

  return result;
}
