import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(10000),
    sessionId: z.string().cuid().optional(),
  }),
});
