import { Router } from "express";
import {
  analyzeContent,
  generateDocument,
  retrieveContext,
  storeContent,
} from "@/controllers/content.controller.js";
import { authenticate } from "@/middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.post("/store", storeContent);
router.post("/retrieve", retrieveContext);
router.post("/analyze", analyzeContent);
router.post("/generate-doc", generateDocument);

export default router;

