import { z } from "zod";

export const createWorkflowSchema = z.object({
  body: z.object({
    goal: z.string().min(1),
    userId: z.string().optional(), // Fallback to auth userId
    sessionId: z.string().uuid(),
  }),
});

export const getWorkflowSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const pauseWorkflowSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    reason: z.string().optional(),
  }),
});
