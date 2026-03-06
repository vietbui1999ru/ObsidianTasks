/**
 * CLI script: Headless batch resume generation.
 * Usage: npx tsx scripts/batch-run.ts --jd-dir ./job-descriptions
 */

import { config } from "dotenv";
config();

async function main() {
  const args = process.argv.slice(2);
  const jdDirIndex = args.indexOf("--jd-dir");
  const jdDir = jdDirIndex !== -1 ? args[jdDirIndex + 1] : undefined;

  if (!jdDir) {
    console.error("Usage: npx tsx scripts/batch-run.ts --jd-dir <path>");
    process.exit(1);
  }

  console.log(`Reading job descriptions from: ${jdDir}`);
  // TODO: Wire up WorkflowEngine for headless batch execution
  console.log("Batch run not yet implemented");
}

main().catch(console.error);
