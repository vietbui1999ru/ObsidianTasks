import type { SkillResult } from "@obsidian-tasks/shared";
import type { ClaudeClient } from "../../llm/ClaudeClient.js";
import { SkillError } from "./SkillError.js";

export abstract class BaseSkill {
  abstract readonly name: string;

  protected readonly claudeClient: ClaudeClient;

  constructor(claudeClient: ClaudeClient) {
    this.claudeClient = claudeClient;
  }

  /**
   * Subclasses implement the core skill logic here.
   */
  abstract execute(
    input: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<SkillResult>;

  /**
   * Public entry point. Wraps execute() with error handling and
   * always returns a well-formed SkillResult.
   */
  async run(
    input: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<SkillResult> {
    try {
      const result = await this.execute(input, context);
      return {
        ...result,
        skillName: this.name,
        success: true,
      };
    } catch (err) {
      const error =
        err instanceof SkillError
          ? err
          : err instanceof Error
            ? err
            : new Error(String(err));

      console.error(`[${this.name}] Skill execution failed:`, error.message);

      return {
        skillName: this.name,
        success: false,
        data: null,
        error: error.message,
      };
    }
  }
}
