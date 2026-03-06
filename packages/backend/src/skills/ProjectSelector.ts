import type {
  SkillResult,
  VaultData,
  ParsedJobDescription,
} from "@obsidian-tasks/shared";
import { BaseSkill } from "./base/BaseSkill.js";
import { SkillError } from "./base/SkillError.js";
import { buildSystemPrompt, buildUserMessage } from "../llm/PromptBuilder.js";

interface SelectedProject {
  title: string;
  relevanceScore: number;
  reason: string;
  suggestedBullets: string[];
}

interface ProjectSelectorOutput {
  selectedProjects: SelectedProject[];
}

const SYSTEM_CONTEXT = `You are an expert resume consultant specializing in selecting the most impactful projects to highlight on a tailored resume.

Given:
- A candidate's full list of projects (from their vault)
- A parsed job description with required/preferred skills, responsibilities, and keywords
- A profile analysis indicating which skills match and suggested areas of focus

Your task:
1. Rank ALL projects by relevance to the job description.
2. Select the top 3-5 most relevant projects.
3. For each selected project, provide:
   - "title": the project title (must match the original exactly)
   - "relevanceScore": 0-100 indicating how relevant it is to the JD
   - "reason": a concise explanation of why this project is relevant
   - "suggestedBullets": 2-3 tailored bullet points that highlight impact and technologies relevant to the JD

Return ONLY valid JSON. No markdown, no explanation, no code fences.
The JSON must match this exact shape:
{
  "selectedProjects": [
    {
      "title": "string",
      "relevanceScore": number,
      "reason": "string",
      "suggestedBullets": ["string", "string"]
    }
  ]
}`;

export class ProjectSelector extends BaseSkill {
  readonly name = "project_selector";

  async execute(
    input: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<SkillResult> {
    const vaultData = input.vaultData as VaultData;
    const parsedJd = input.parsedJd as ParsedJobDescription;
    const profileAnalysis = input.profileAnalysis as Record<string, unknown>;

    const system = buildSystemPrompt(this.name, SYSTEM_CONTEXT);

    const userMessage = buildUserMessage({
      projects: vaultData.projects,
      jobDescription: {
        company: parsedJd.company,
        title: parsedJd.title,
        seniorityLevel: parsedJd.seniorityLevel,
        requiredSkills: parsedJd.requiredSkills,
        preferredSkills: parsedJd.preferredSkills,
        responsibilities: parsedJd.responsibilities,
        qualifications: parsedJd.qualifications,
        keywords: parsedJd.keywords,
      },
      profileAnalysis,
    });

    const response = await this.claudeClient.sendMessage({
      system,
      messages: [{ role: "user", content: userMessage }],
    });

    let parsed: ProjectSelectorOutput;
    try {
      parsed = JSON.parse(response.content) as ProjectSelectorOutput;
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
      data: { selectedProjects: parsed.selectedProjects },
      tokenUsage: {
        input: response.usage.input,
        output: response.usage.output,
      },
    };
  }
}
