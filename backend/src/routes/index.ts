import { Router } from "express";
import healthRoutes from "@/routes/health.routes.js";
import authRoutes from "@/routes/auth.routes.js";
import chatRoutes from "@/routes/chat.routes.js";
import intentRoutes from "@/routes/intent.routes.js";
import workflowRoutes from "@/routes/workflow.routes.js";
import evolutionRoutes from "@/routes/evolution.routes.js";
import multiAgentRoutes from "@/routes/multi-agent.routes.js";
import autonomyRoutes from "@/routes/autonomy.routes.js";
import contentRoutes from "@/routes/content.routes.js";

export const v1Router = Router();
v1Router.use("/", chatRoutes);
v1Router.use("/intent", intentRoutes);
v1Router.use("/workflows", workflowRoutes);
v1Router.use("/evolution", evolutionRoutes);
v1Router.use("/multi-agent", multiAgentRoutes);
v1Router.use("/autonomy", autonomyRoutes);
v1Router.use("/", contentRoutes);

export const rootRouter = Router();
rootRouter.use("/health", healthRoutes);
rootRouter.use("/auth", authRoutes);
rootRouter.use("/v1", v1Router);

export default rootRouter;
