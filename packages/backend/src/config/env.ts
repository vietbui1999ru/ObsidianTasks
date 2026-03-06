import { config } from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve .env from the monorepo root (4 levels up: config/ → src/ → backend/ → packages/ → root)
config({ path: path.resolve(__dirname, "../../../../.env") });

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  VAULT_PATH: z.string().min(1, "VAULT_PATH is required"),
  PROFILE_PATH: z.string().min(1, "PROFILE_PATH is required"),
  OUTPUT_PATH: z.string().default("./generated-resumes"),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    console.error("Environment validation failed:\n" + missing.join("\n"));
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
