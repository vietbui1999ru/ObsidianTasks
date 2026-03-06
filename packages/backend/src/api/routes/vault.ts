import { Router } from "express";
import { normalizeVault } from "../../ingestion/index.js";
import { env } from "../../config/env.js";

export const vaultRouter = Router();

vaultRouter.post("/scan", async (_req, res, next) => {
  try {
    const vaultData = await normalizeVault(env.PROFILE_PATH);
    res.json(vaultData);
  } catch (error) {
    next(error);
  }
});
