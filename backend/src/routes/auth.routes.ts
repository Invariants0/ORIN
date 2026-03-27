import { toNodeHandler } from "better-auth/node";
import { auth } from "@/config/auth.js";
import { Router } from "express";

const router = Router();

router.use((req, res) => {
  return toNodeHandler(auth)(req, res);
});

export default router;
