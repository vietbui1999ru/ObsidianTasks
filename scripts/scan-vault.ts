/**
 * CLI script: One-off vault scan without the UI.
 * Usage: npx tsx scripts/scan-vault.ts
 */

import { config } from "dotenv";
config();

async function main() {
  const vaultPath = process.env.VAULT_PATH;
  if (!vaultPath) {
    console.error("VAULT_PATH not set in .env");
    process.exit(1);
  }

  console.log(`Scanning vault at: ${vaultPath}`);
  // TODO: Wire up VaultScanner + VaultNormalizer
  console.log("Vault scan not yet implemented");
}

main().catch(console.error);
