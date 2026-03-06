import { config } from "dotenv";
import { z } from "zod";
import path from "node:path";

config({ path: path.resolve(process.cwd(), "../../.env") });

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  VAULT_PATH: z.string().min(1, "VAULT_PATH is required"),
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
