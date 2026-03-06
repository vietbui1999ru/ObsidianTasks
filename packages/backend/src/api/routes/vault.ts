import { Router } from "express";

export const vaultRouter = Router();

vaultRouter.post("/scan", async (_req, res, next) => {
  try {
    // TODO: Wire up VaultScanner + VaultNormalizer
    res.json({ message: "Vault scan not yet implemented" });
  } catch (error) {
    next(error);
  }
});
