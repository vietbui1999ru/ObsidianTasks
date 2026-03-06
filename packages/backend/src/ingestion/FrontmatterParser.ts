import matter from "gray-matter";

/** Result of parsing YAML frontmatter from a markdown file. */
export interface FrontmatterResult {
  /** Parsed YAML data. Empty object when no frontmatter is present. */
  frontmatter: Record<string, unknown>;
  /** The markdown body with frontmatter stripped. */
  body: string;
}

/**
 * Extracts YAML frontmatter from markdown content using gray-matter.
 *
 * Gracefully handles:
 * - Files with no frontmatter (returns empty object + full body).
 * - Malformed YAML (returns empty object + original content, does not throw).
 * - Empty/blank input (returns empty object + empty body).
 */
export function parseFrontmatter(content: string): FrontmatterResult {
  if (!content || !content.trim()) {
    return { frontmatter: {}, body: "" };
  }

  try {
    const result = matter(content);
    return {
      frontmatter: result.data ?? {},
      body: result.content ?? "",
    };
  } catch {
    // Malformed frontmatter — treat the entire input as body.
    return { frontmatter: {}, body: content };
  }
}
