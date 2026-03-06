import type { SkillResult, VaultData } from "@obsidian-tasks/shared";
import { BaseSkill } from "./base/BaseSkill.js";

/**
 * Deterministic skill that validates resume markdown without any LLM calls.
 * Checks structure, required sections, contact info, placeholders, and length.
 */
export class OutputValidator extends BaseSkill {
  readonly name = "output_validator";

  /**
   * Accept `null` for claudeClient since this skill never calls the LLM.
   * The BaseSkill constructor expects a ClaudeClient, so we use `as any`
   * to satisfy the type while keeping the rest of the base class functional.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(claudeClient?: any) {
    super(claudeClient ?? (null as any));
  }

  async execute(
    input: Record<string, unknown>,
    _context: Record<string, unknown>,
  ): Promise<SkillResult> {
    const resume = input.optimizedResume as string | undefined;
    const vaultData = input.vaultData as VaultData | undefined;

    const errors: string[] = [];
    const warnings: string[] = [];

    // ── Guard: resume must be a non-empty string ───────────────────────
    if (typeof resume !== "string" || resume.trim() === "") {
      errors.push("optimizedResume is missing or empty");
      return this.buildResult(false, errors, warnings);
    }

    const resumeLower = resume.toLowerCase();

    // ── 1. Required sections ───────────────────────────────────────────
    const requiredSections: [string, string][] = [
      ["# ", "Name heading (# )"],
      ["## summary", "## Summary"],
      ["## skills", "## Skills"],
      ["## experience", "## Experience"],
    ];

    for (const [marker, label] of requiredSections) {
      if (!resumeLower.includes(marker)) {
        errors.push(`Missing required section: ${label}`);
      }
    }

    // Optional section warnings
    if (!resumeLower.includes("## education")) {
      warnings.push("Missing optional section: ## Education");
    }

    // ── 2. Name present ────────────────────────────────────────────────
    if (vaultData?.profile?.name) {
      const nameHeadingMatch = resume.match(/^#\s+(.+)$/m);
      if (nameHeadingMatch) {
        const headingText = nameHeadingMatch[1].toLowerCase();
        const candidateName = vaultData.profile.name.toLowerCase();
        if (!headingText.includes(candidateName)) {
          errors.push(
            `Name heading does not contain candidate name "${vaultData.profile.name}"`,
          );
        }
      } else {
        // Already captured as missing "# " section above — no extra error needed
      }
    }

    // ── 3. Contact info present ────────────────────────────────────────
    const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(resume);
    const hasPhone = /[\d().\-+\s]{7,}/.test(resume);

    if (!hasEmail && !hasPhone) {
      const vaultHasContact =
        vaultData?.profile?.email || vaultData?.profile?.phone;
      if (vaultHasContact) {
        errors.push("Resume is missing contact info (no email or phone found)");
      } else {
        warnings.push(
          "No email or phone detected in resume (vault profile also has none)",
        );
      }
    }

    // ── 4. Skills section not empty (at least 3 skills) ────────────────
    const skillsSectionContent = this.extractSection(resume, "skills");
    if (skillsSectionContent !== null) {
      // Count items: lines starting with `- `, `* `, or comma-separated items
      const bulletItems = skillsSectionContent.match(/^[\s]*[-*]\s+.+/gm) ?? [];
      const commaItems =
        bulletItems.length === 0
          ? skillsSectionContent
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
          : [];

      const skillCount = Math.max(bulletItems.length, commaItems.length);

      if (skillCount < 3) {
        errors.push(
          `Skills section has fewer than 3 skills (found ~${skillCount})`,
        );
      }
    }

    // ── 5. Experience has bullets ──────────────────────────────────────
    const experienceContent = this.extractSection(resume, "experience");
    if (experienceContent !== null) {
      // Split on ### subsections (individual roles)
      const roleBlocks = experienceContent.split(/^###\s+/m).filter(Boolean);

      for (const block of roleBlocks) {
        const firstLine = block.split("\n")[0].trim();
        const hasBullet = /^[\s]*-\s+.+/m.test(block);
        if (!hasBullet && firstLine.length > 0) {
          warnings.push(
            `Experience entry "${firstLine.slice(0, 60)}" has no bullet points`,
          );
        }
      }

      if (roleBlocks.length === 0) {
        warnings.push("Experience section has no role subsections (### )");
      }
    }

    // ── 6. Reasonable length ───────────────────────────────────────────
    const charCount = resume.length;
    if (charCount < 200) {
      errors.push(
        `Resume is too short (${charCount} chars, minimum 200)`,
      );
    } else if (charCount > 5000) {
      warnings.push(
        `Resume is quite long (${charCount} chars, recommended max 5000)`,
      );
    }

    // ── 7. No placeholder text ─────────────────────────────────────────
    const placeholders: [RegExp, string][] = [
      [/\{[^}]*\}/, "Contains placeholder braces { }"],
      [/\bTODO\b/i, 'Contains "TODO"'],
      [/\[insert/i, 'Contains "[insert..."'],
      [/lorem ipsum/i, 'Contains "lorem ipsum"'],
    ];

    for (const [pattern, message] of placeholders) {
      if (pattern.test(resume)) {
        errors.push(`Placeholder text detected: ${message}`);
      }
    }

    // ── Build final result ─────────────────────────────────────────────
    const valid = errors.length === 0;
    return this.buildResult(valid, errors, warnings);
  }

  /**
   * Extract the content of a ## section by name (case-insensitive).
   * Returns the text between the matched heading and the next ## heading,
   * or null if the section doesn't exist.
   */
  private extractSection(resume: string, sectionName: string): string | null {
    const pattern = new RegExp(
      `^##\\s+${sectionName}\\b[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|$(?!\\n))`,
      "im",
    );
    const match = resume.match(pattern);
    return match ? match[1] : null;
  }

  private buildResult(
    valid: boolean,
    errors: string[],
    warnings: string[],
  ): SkillResult {
    return {
      skillName: this.name,
      success: true, // The skill itself succeeded; `valid` indicates the resume's validity
      data: { valid, errors, warnings },
    };
  }
}
