import { Router } from "express";

const router = Router();

// Health check endpoint
router.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "ORIN API is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;
