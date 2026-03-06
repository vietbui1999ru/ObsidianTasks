import { readFile } from "node:fs/promises";

// ---------------------------------------------------------------------------
// StyleConfig — matches the shape of templates/style-config.json
// ---------------------------------------------------------------------------

export interface StyleConfig {
  fonts: {
    heading: string;
    body: string;
  };
  fontSize: {
    name: number;
    sectionHeading: number;
    body: number;
  };
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  spacing: {
    afterParagraph: number;
    afterSection: number;
  };
}

// ---------------------------------------------------------------------------
// Defaults — used when the config file is missing or unreadable
// ---------------------------------------------------------------------------

const DEFAULT_STYLE_CONFIG: StyleConfig = {
  fonts: {
    heading: "Calibri",
    body: "Calibri",
  },
  fontSize: {
    name: 24,
    sectionHeading: 14,
    body: 11,
  },
  margins: {
    top: 720,
    bottom: 720,
    left: 720,
    right: 720,
  },
  spacing: {
    afterParagraph: 120,
    afterSection: 200,
  },
};

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Read and parse a JSON style-config file from disk.
 * Returns sensible defaults when the file is missing or cannot be parsed.
 */
export async function loadStyleConfig(
  configPath: string,
): Promise<StyleConfig> {
  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== "object" || parsed === null) {
      return { ...DEFAULT_STYLE_CONFIG };
    }

    // Merge top-level sections so partial configs still work
    const cfg = parsed as Record<string, unknown>;
    return {
      fonts: {
        ...DEFAULT_STYLE_CONFIG.fonts,
        ...(typeof cfg.fonts === "object" && cfg.fonts !== null
          ? (cfg.fonts as Record<string, string>)
          : {}),
      },
      fontSize: {
        ...DEFAULT_STYLE_CONFIG.fontSize,
        ...(typeof cfg.fontSize === "object" && cfg.fontSize !== null
          ? (cfg.fontSize as Record<string, number>)
          : {}),
      },
      margins: {
        ...DEFAULT_STYLE_CONFIG.margins,
        ...(typeof cfg.margins === "object" && cfg.margins !== null
          ? (cfg.margins as Record<string, number>)
          : {}),
      },
      spacing: {
        ...DEFAULT_STYLE_CONFIG.spacing,
        ...(typeof cfg.spacing === "object" && cfg.spacing !== null
          ? (cfg.spacing as Record<string, number>)
          : {}),
      },
    };
  } catch {
    // File missing or unparseable — fall back to defaults
    return { ...DEFAULT_STYLE_CONFIG };
  }
}
