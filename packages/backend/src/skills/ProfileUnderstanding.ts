import type {
  SkillResult,
  VaultData,
  ParsedJobDescription,
} from "@obsidian-tasks/shared";
import { BaseSkill } from "./base/BaseSkill.js";
import { SkillError } from "./base/SkillError.js";
import { buildSystemPrompt, buildUserMessage } from "../llm/PromptBuilder.js";

interface ProfileAnalysis {
  matchingSkills: string[];
  missingSkills: string[];
  relevantExperience: Array<{
    company: string;
    role: string;
    relevanceScore: number;
    reason: string;
  }>;
  profileStrengths: string[];
  suggestedFocus: string;
}

const SYSTEM_CONTEXT = `You analyze a candidate's profile (vault data) against a job description.
Your goal is to produce a structured comparison that highlights alignment and gaps.

Return ONLY valid JSON with this exact shape (no markdown, no explanation):
{
  "matchingSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3"],
  "relevantExperience": [
    {
      "company": "Acme Corp",
      "role": "Software Engineer",
      "relevanceScore": 0.85,
      "reason": "Built distributed systems matching JD requirements"
    }
  ],
  "profileStrengths": ["strength1", "strength2"],
  "suggestedFocus": "Brief note on what the resume should emphasize"
}

Rules:
- matchingSkills: skills from the candidate's vault that match required or preferred skills in the JD.
- missingSkills: skills listed as required or preferred in the JD that are NOT present in the candidate's vault.
- relevantExperience: each experience entry from the vault, ranked by relevanceScore (0-1) to this JD. Include only experiences with relevanceScore > 0. Sort descending by relevanceScore.
- profileStrengths: key strengths the candidate has relative to this specific JD.
- suggestedFocus: a single sentence on what the tailored resume should emphasize.`;

export class ProfileUnderstanding extends BaseSkill {
  readonly name = "profile_understanding";

  async execute(
    input: Record<string, unknown>,
    _context: Record<string, unknown>,
  ): Promise<SkillResult> {
    const vaultData = input.vaultData as VaultData;
    const parsedJd = input.parsedJd as ParsedJobDescription;

    const system = buildSystemPrompt(this.name, SYSTEM_CONTEXT);

    const userMessage = buildUserMessage({
      candidate_profile: {
        name: vaultData.profile.name,
        summary: vaultData.profile.summary,
      },
      candidate_skills: vaultData.skills,
      candidate_experience: vaultData.experiences,
      candidate_projects: vaultData.projects,
      candidate_education: vaultData.education,
      job_description: {
        company: parsedJd.company,
        title: parsedJd.title,
        seniorityLevel: parsedJd.seniorityLevel,
        requiredSkills: parsedJd.requiredSkills,
        preferredSkills: parsedJd.preferredSkills,
        responsibilities: parsedJd.responsibilities,
        qualifications: parsedJd.qualifications,
        keywords: parsedJd.keywords,
      },
    });

    const response = await this.claudeClient.sendMessage({
      system,
      messages: [{ role: "user", content: userMessage }],
    });

    let profileAnalysis: ProfileAnalysis;
    try {
      profileAnalysis = JSON.parse(response.content) as ProfileAnalysis;
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
      data: { profileAnalysis },
      tokenUsage: {
        input: response.usage.input,
        output: response.usage.output,
      },
    };
  }
}
