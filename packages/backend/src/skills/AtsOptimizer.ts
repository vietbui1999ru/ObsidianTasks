import type { SkillResult, ParsedJobDescription } from "@obsidian-tasks/shared";
import { BaseSkill } from "./base/BaseSkill.js";
import { SkillError } from "./base/SkillError.js";
import { buildSystemPrompt, buildUserMessage } from "../llm/PromptBuilder.js";

interface AtsReport {
  keywordsAdded: string[];
  keywordsMissing: string[];
  compatibilityScore: number;
  suggestions: string[];
}

const REPORT_SEPARATOR = "---ATS_REPORT---";

const DEFAULT_ATS_REPORT: AtsReport = {
  keywordsAdded: [],
  keywordsMissing: [],
  compatibilityScore: 0,
  suggestions: [
    "Unable to generate ATS report. Review the optimized resume manually.",
  ],
};

const SYSTEM_CONTEXT = `You are an ATS (Applicant Tracking System) optimization expert.
Your task is to review a resume (provided as markdown) against specific job description keywords and required skills, then return an optimized version that maximizes ATS compatibility.

Instructions:
1. Review the resume for ATS compatibility issues.
2. Naturally incorporate missing JD keywords into existing bullet points where they are truthful and relevant. Do NOT fabricate experience or skills the candidate does not have.
3. Ensure skill names match the JD terminology exactly (e.g., if the JD says "React.js", use "React.js" instead of "React"; if the JD says "PostgreSQL", use "PostgreSQL" instead of "Postgres").
4. Avoid keyword stuffing. Only add keywords where they fit naturally within the context of existing accomplishments or responsibilities.
5. Fix any formatting issues that ATS parsers commonly struggle with:
   - No tables, no columns, no images.
   - Use simple markdown headers, bullet points, and plain text.
   - Ensure consistent date formatting.
   - Use standard section headings (Experience, Education, Skills, etc.).
6. Preserve the candidate's original accomplishments and meaning. Optimization should enhance discoverability, not rewrite the narrative.

Output format:
- First, output the optimized markdown resume as raw markdown. Do NOT wrap it in code fences.
- Then output a separator line containing exactly: ${REPORT_SEPARATOR}
- After the separator, output a JSON object (no code fences) with this exact shape:
  {
    "keywordsAdded": ["keyword1", "keyword2"],
    "keywordsMissing": ["keyword3"],
    "compatibilityScore": 85,
    "suggestions": ["suggestion1", "suggestion2"]
  }

Field definitions for the JSON report:
- keywordsAdded: JD keywords that you successfully incorporated into the resume.
- keywordsMissing: JD keywords that could NOT be added truthfully (the candidate lacks the experience).
- compatibilityScore: An estimated ATS compatibility score from 0 to 100.
- suggestions: Actionable suggestions for the candidate to further improve their resume.`;

export class AtsOptimizer extends BaseSkill {
  readonly name = "ats_optimizer";

  async execute(
    input: Record<string, unknown>,
    _context: Record<string, unknown>,
  ): Promise<SkillResult> {
    const markdownResume = input.markdownResume;
    const parsedJd = input.parsedJd as ParsedJobDescription | undefined;

    if (typeof markdownResume !== "string" || markdownResume.trim() === "") {
      throw new SkillError({
        message: "input.markdownResume must be a non-empty string",
        skillName: this.name,
        retryable: false,
      });
    }

    if (!parsedJd || !Array.isArray(parsedJd.keywords)) {
      throw new SkillError({
        message:
          "input.parsedJd must be a ParsedJobDescription with a keywords array",
        skillName: this.name,
        retryable: false,
      });
    }

    const system = buildSystemPrompt(this.name, SYSTEM_CONTEXT);

    const userMessage = buildUserMessage({
      resume: markdownResume,
      jd_keywords: parsedJd.keywords,
      jd_required_skills: parsedJd.requiredSkills,
      jd_preferred_skills: parsedJd.preferredSkills,
      jd_title: parsedJd.title,
      jd_company: parsedJd.company,
    });

    const response = await this.claudeClient.sendMessage({
      system,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 8192,
    });

    const { optimizedResume, atsReport } = parseResponse(
      response.content,
      this.name,
    );

    return {
      skillName: this.name,
      success: true,
      data: { optimizedResume, atsReport },
      tokenUsage: {
        input: response.usage.input,
        output: response.usage.output,
      },
    };
  }
}

/**
 * Splits the Claude response on the report separator.
 * Returns the optimized resume markdown and a parsed ATS report.
 * Falls back to defaults if the separator or JSON is missing/malformed.
 */
function parseResponse(
  raw: string,
  skillName: string,
): { optimizedResume: string; atsReport: AtsReport } {
  const separatorIndex = raw.indexOf(REPORT_SEPARATOR);

  if (separatorIndex === -1) {
    console.warn(
      `[${skillName}] Response did not contain ${REPORT_SEPARATOR}. ` +
        "Using entire response as optimized resume with default report.",
    );
    return {
      optimizedResume: raw.trim(),
      atsReport: { ...DEFAULT_ATS_REPORT },
    };
  }

  const optimizedResume = raw.slice(0, separatorIndex).trim();
  const reportRaw = raw.slice(separatorIndex + REPORT_SEPARATOR.length).trim();

  let atsReport: AtsReport;
  try {
    // Strip code fences in case Claude wraps the JSON despite instructions.
    const cleaned = reportRaw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    atsReport = JSON.parse(cleaned) as AtsReport;
  } catch {
    console.warn(
      `[${skillName}] Failed to parse ATS report JSON. Using defaults. ` +
        `Raw: ${reportRaw.slice(0, 200)}`,
    );
    atsReport = { ...DEFAULT_ATS_REPORT };
  }

  return { optimizedResume, atsReport };
}
