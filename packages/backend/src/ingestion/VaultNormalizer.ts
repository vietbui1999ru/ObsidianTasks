import type {
  VaultData,
  VaultEducation,
  VaultExperience,
  VaultProfile,
  VaultProject,
  VaultSkill,
} from "@obsidian-tasks/shared";

import { scanVault } from "./VaultScanner.js";
import { parseFrontmatter } from "./FrontmatterParser.js";
import { parseSections } from "./SectionParser.js";
import type { SectionData } from "./SectionParser.js";

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ParsedFile {
  filePath: string;
  frontmatter: Record<string, unknown>;
  sections: SectionData;
}

// ---------------------------------------------------------------------------
// Frontmatter field extraction helpers
// ---------------------------------------------------------------------------

function str(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

function strArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Build a VaultProfile from frontmatter fields across all parsed files.
 * Frontmatter keys are matched case-insensitively.
 */
function extractProfileFromFrontmatter(
  files: ParsedFile[],
): Partial<VaultProfile> {
  const profile: Partial<VaultProfile> = {};

  for (const file of files) {
    const fm = normalizeKeys(file.frontmatter);
    profile.name ??= str(fm["name"]) ?? str(fm["fullname"]) ?? str(fm["full_name"]);
    profile.email ??= str(fm["email"]) ?? str(fm["e-mail"]);
    profile.phone ??= str(fm["phone"]) ?? str(fm["telephone"]) ?? str(fm["mobile"]);
    profile.location ??= str(fm["location"]) ?? str(fm["city"]) ?? str(fm["address"]);
    profile.linkedin ??= str(fm["linkedin"]);
    profile.github ??= str(fm["github"]);
    profile.website ??= str(fm["website"]) ?? str(fm["url"]) ?? str(fm["site"]);
    profile.summary ??= str(fm["summary"]) ?? str(fm["about"]) ?? str(fm["bio"]);
  }

  return profile;
}

/** Lowercase all keys in a record for case-insensitive lookup. */
function normalizeKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k.toLowerCase().replace(/\s+/g, "_")] = v;
  }
  return out;
}

/**
 * Extract skills listed in frontmatter (commonly as a YAML array or
 * comma-separated string under a `skills` or `technologies` key).
 */
function extractSkillsFromFrontmatter(files: ParsedFile[]): VaultSkill[] {
  const skills: VaultSkill[] = [];
  for (const file of files) {
    const fm = normalizeKeys(file.frontmatter);
    const raw = fm["skills"] ?? fm["technologies"] ?? fm["tech_stack"];
    if (raw) {
      for (const name of strArray(raw)) {
        skills.push({ name });
      }
    }
  }
  return skills;
}

/**
 * Extract experience entries from frontmatter (less common, but possible as a
 * YAML array of objects).
 */
function extractExperienceFromFrontmatter(
  files: ParsedFile[],
): VaultExperience[] {
  const entries: VaultExperience[] = [];
  for (const file of files) {
    const fm = normalizeKeys(file.frontmatter);
    const raw = fm["experience"] ?? fm["work"] ?? fm["employment"];
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          entries.push({
            company: str(obj.company) ?? "Unknown",
            role: str(obj.role) ?? str(obj.title) ?? "Unknown",
            startDate: str(obj.startDate) ?? str(obj.start) ?? "Unknown",
            endDate: str(obj.endDate) ?? str(obj.end),
            bullets: strArray(obj.bullets ?? obj.highlights ?? obj.description),
            location: str(obj.location),
          });
        }
      }
    }
  }
  return entries;
}

/**
 * Extract project entries from frontmatter.
 */
function extractProjectsFromFrontmatter(files: ParsedFile[]): VaultProject[] {
  const entries: VaultProject[] = [];
  for (const file of files) {
    const fm = normalizeKeys(file.frontmatter);
    const raw = fm["projects"];
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          entries.push({
            title: str(obj.title) ?? str(obj.name) ?? "Untitled",
            description: str(obj.description) ?? "",
            techStack: strArray(obj.techStack ?? obj.tech ?? obj.technologies),
            tags: strArray(obj.tags ?? obj.categories),
            url: str(obj.url) ?? str(obj.link),
          });
        }
      }
    }
  }
  return entries;
}

/**
 * Extract education entries from frontmatter.
 */
function extractEducationFromFrontmatter(
  files: ParsedFile[],
): VaultEducation[] {
  const entries: VaultEducation[] = [];
  for (const file of files) {
    const fm = normalizeKeys(file.frontmatter);
    const raw = fm["education"];
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          entries.push({
            institution:
              str(obj.institution) ?? str(obj.school) ?? str(obj.university) ?? "Unknown",
            degree: str(obj.degree) ?? "Unknown",
            field: str(obj.field) ?? str(obj.major),
            startDate: str(obj.startDate) ?? str(obj.start),
            endDate: str(obj.endDate) ?? str(obj.end),
            gpa: str(obj.gpa),
          });
        }
      }
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

/** Deduplicate skills by lowercased name, keeping the first occurrence. */
function deduplicateSkills(skills: VaultSkill[]): VaultSkill[] {
  const seen = new Set<string>();
  const out: VaultSkill[] = [];
  for (const skill of skills) {
    const key = skill.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(skill);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

function generateWarnings(data: VaultData): string[] {
  const warnings: string[] = [];
  if (!data.profile.name) {
    warnings.push("Missing profile name: no 'name' found in frontmatter, headings, or file content.");
  }
  if (!data.profile.email && !data.profile.phone) {
    warnings.push(
      "Missing contact information: no email or phone found in frontmatter.",
    );
  }
  if (data.skills.length === 0) {
    warnings.push("Empty skills list: no skills detected in any vault file.");
  }
  if (data.experiences.length === 0) {
    warnings.push(
      "Zero experience entries: no work experience detected in any vault file.",
    );
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full vault ingestion pipeline:
 *   1. Scan the vault directory for `.md` files
 *   2. Parse frontmatter and markdown sections from each file
 *   3. Merge all parsed data into a single `VaultData` object
 *
 * Frontmatter fields take precedence over section-parsed fields.
 * Skills from both sources are deduplicated by name (case-insensitive).
 */
export async function normalizeVault(vaultPath: string): Promise<VaultData> {
  // Step 1: Scan
  const files = await scanVault(vaultPath);

  // Step 2: Parse each file
  const parsed: ParsedFile[] = files.map((file) => {
    const { frontmatter, body } = parseFrontmatter(file.content);
    const sections = parseSections(body);
    return { filePath: file.filePath, frontmatter, sections };
  });

  // Step 3: Merge

  // --- Profile ---
  const fmProfile = extractProfileFromFrontmatter(parsed);

  // Collect profile name from sections (e.g. `# Viet Bui — ...` heading)
  const sectionProfileName = parsed
    .map((p) => p.sections.profileName)
    .find(Boolean);

  // Collect summary from sections as fallback
  const sectionSummary = parsed
    .map((p) => p.sections.summary)
    .filter(Boolean)
    .join("\n");

  const profile: VaultProfile = {
    name: fmProfile.name ?? sectionProfileName ?? "",
    email: fmProfile.email,
    phone: fmProfile.phone,
    location: fmProfile.location,
    linkedin: fmProfile.linkedin,
    github: fmProfile.github,
    website: fmProfile.website,
    summary: fmProfile.summary ?? sectionSummary,
  };

  // --- Skills (frontmatter first, then sections, deduplicated) ---
  const fmSkills = extractSkillsFromFrontmatter(parsed);
  const sectionSkills = parsed.flatMap((p) => p.sections.skills);
  const skills = deduplicateSkills([...fmSkills, ...sectionSkills]);

  // --- Experience (frontmatter first, then sections) ---
  const fmExperience = extractExperienceFromFrontmatter(parsed);
  const sectionExperience = parsed.flatMap((p) => p.sections.experiences);
  const experiences = fmExperience.length > 0 ? fmExperience : sectionExperience;

  // --- Projects (frontmatter first, then sections) ---
  const fmProjects = extractProjectsFromFrontmatter(parsed);
  const sectionProjects = parsed.flatMap((p) => p.sections.projects);
  const projects = fmProjects.length > 0 ? fmProjects : sectionProjects;

  // --- Education (frontmatter first, then sections) ---
  const fmEducation = extractEducationFromFrontmatter(parsed);
  const sectionEducation = parsed.flatMap((p) => p.sections.education);
  const education = fmEducation.length > 0 ? fmEducation : sectionEducation;

  // Assemble
  const data: VaultData = {
    profile,
    skills,
    projects,
    experiences,
    education,
    warnings: [],
  };

  data.warnings = generateWarnings(data);

  return data;
}
