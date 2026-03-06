import type { SkillResult, ParsedJobDescription } from "@obsidian-tasks/shared";
import { BaseSkill } from "./base/BaseSkill.js";
import { SkillError } from "./base/SkillError.js";
import { buildSystemPrompt, buildUserMessage } from "../llm/PromptBuilder.js";

const SYSTEM_CONTEXT = `Your task is to extract structured information from a job description.

Extract the following fields:
- company: The name of the hiring company.
- title: The job title exactly as listed.
- seniorityLevel: The seniority level (e.g. "Junior", "Mid", "Senior", "Staff", "Lead", "Principal", "Manager", "Director"). Omit if not determinable.
- requiredSkills: An array of skills explicitly listed as required.
- preferredSkills: An array of skills listed as preferred, nice-to-have, or bonus.
- responsibilities: An array of key responsibilities or duties.
- qualifications: An array of qualifications (education, years of experience, certifications, etc.).
- keywords: An array of ATS-relevant keywords and phrases found in the job description (technologies, methodologies, domain terms, tools).

Rules:
- Return ONLY valid JSON. No markdown fences, no explanation, no extra text.
- The JSON must conform to this TypeScript interface:
  {
    company: string;
    title: string;
    seniorityLevel?: string;
    requiredSkills: string[];
    preferredSkills: string[];
    responsibilities: string[];
    qualifications: string[];
    keywords: string[];
  }
- If a field cannot be determined, use an empty string for strings or an empty array for arrays.
- Do not invent information that is not present in the job description.`;

export class JobDescriptionParser extends BaseSkill {
  readonly name = "job_description_parser";

  async execute(
    input: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<SkillResult> {
    const rawJobDescription = input.rawJobDescription;

    if (typeof rawJobDescription !== "string" || rawJobDescription.trim() === "") {
      throw new SkillError({
        message: "input.rawJobDescription must be a non-empty string",
        skillName: this.name,
        retryable: false,
      });
    }

    const system = buildSystemPrompt(this.name, SYSTEM_CONTEXT);
    const userMessage = buildUserMessage({ rawJobDescription });

    const response = await this.claudeClient.sendMessage({
      system,
      messages: [{ role: "user", content: userMessage }],
    });

    let parsedJd: ParsedJobDescription;

    try {
      parsedJd = JSON.parse(response.content) as ParsedJobDescription;
    } catch (cause) {
      throw new SkillError({
        message: `Failed to parse Claude response as JSON: ${response.content.slice(0, 200)}`,
        skillName: this.name,
        retryable: true,
        cause: cause instanceof Error ? cause : new Error(String(cause)),
      });
    }

    return {
      skillName: this.name,
      success: true,
      data: { parsedJd },
      tokenUsage: {
        input: response.usage.input,
        output: response.usage.output,
      },
    };
  }
}
