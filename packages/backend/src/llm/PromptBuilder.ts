/**
 * Builds structured prompts for skill execution.
 * Uses XML-style tags for clear delineation of sections.
 */

export function buildSystemPrompt(
  skillName: string,
  context?: string,
): string {
  const lines: string[] = [
    `<skill name="${skillName}">`,
    `You are the "${skillName}" skill in an AI-powered resume-tailoring pipeline.`,
    `Follow instructions precisely and return structured output.`,
  ];

  if (context) {
    lines.push("", `<context>`, context, `</context>`);
  }

  lines.push(`</skill>`);

  return lines.join("\n");
}

export function buildUserMessage(input: Record<string, unknown>): string {
  const sections = Object.entries(input).map(([key, value]) => {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return `<${key}>\n${serialized}\n</${key}>`;
  });

  return sections.join("\n\n");
}
