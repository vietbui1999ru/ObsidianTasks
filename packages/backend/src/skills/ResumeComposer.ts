import type {
  SkillResult,
  VaultData,
  ParsedJobDescription,
} from "@obsidian-tasks/shared";
import { BaseSkill } from "./base/BaseSkill.js";
import { buildSystemPrompt, buildUserMessage } from "../llm/PromptBuilder.js";

const SYSTEM_CONTEXT = `You are an expert resume writer. Your job is to compose a complete markdown resume
that is specifically tailored to a target job description.

Rules:
- Return ONLY the raw markdown. No code fences, no JSON wrapper, no preamble, no commentary.
- Follow the exact section order: Name/Contact, Summary, Skills, Experience, Projects, Education.
- Tailor every section to the job description:
  - Summary: Write 2-3 sentences that position the candidate as a strong fit for this specific role.
  - Skills: List skills as comma-separated values. Place JD-matching skills first, then remaining relevant skills.
  - Experience: Rewrite bullets to emphasize responsibilities and achievements most relevant to the JD. Use JD keywords naturally -- do not force them.
  - Projects: Select and describe projects in a way that highlights relevance to the target role.
- Keep the resume concise and professional. Aim for a length that fits on 1-2 pages when rendered.
- Use strong action verbs and quantify impact where data is available.
- Do not fabricate information. Only use data provided in the input sections.`;

const RESUME_TEMPLATE = `Use this exact markdown structure:

# {Full Name}
{email} | {phone} | {location} | {linkedin} | {github}

## Summary
{2-3 sentence tailored summary}

## Skills
{comma-separated skills, prioritizing JD-matching skills first}

## Experience
### {Role} | {Company} | {Start - End}
- {bullet 1}
- {bullet 2}
...

## Projects
### {Project Title}
- {tailored bullet 1}
- {tailored bullet 2}
...

## Education
### {Degree} | {Institution} | {Dates}`;

export class ResumeComposer extends BaseSkill {
  readonly name = "resume_composer";

  async execute(
    input: Record<string, unknown>,
    _context: Record<string, unknown>,
  ): Promise<SkillResult> {
    const vaultData = input.vaultData as VaultData;
    const parsedJd = input.parsedJd as ParsedJobDescription;
    const profileAnalysis = input.profileAnalysis as Record<string, unknown>;
    const selectedProjects = input.selectedProjects as unknown[];

    const system = buildSystemPrompt(
      this.name,
      `${SYSTEM_CONTEXT}\n\n${RESUME_TEMPLATE}`,
    );

    const userMessage = buildUserMessage({
      vaultData,
      parsedJd,
      profileAnalysis,
      selectedProjects,
    });

    const response = await this.claudeClient.sendMessage({
      system,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 4096,
    });

    const markdownResume = response.content.trim();

    return {
      skillName: this.name,
      success: true,
      data: {
        markdownResume,
        company: parsedJd.company,
        jobTitle: parsedJd.title,
      },
      tokenUsage: response.usage,
    };
  }
}
