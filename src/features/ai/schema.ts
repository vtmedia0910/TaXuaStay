import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1_200),
}).strict();

export const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(1_200),
  history: z.array(messageSchema).max(6).default([]),
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/).optional(),
}).strict();

export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
