import { z } from "zod";
import { isAISelectionActivatable } from "@/features/ai/providers/registry";

export const aiRuntimeDraftSchema = z.object({
  provider: z.string().trim().min(2).max(30),
  model: z.string().trim().min(2).max(100),
  profile_id: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (!isAISelectionActivatable(value.provider, value.model)) {
    context.addIssue({ code: "custom", message: "Provider/model không nằm trong allow-list có tool calling." });
  }
});

export const aiHealthSchema = z.object({
  provider: z.string().trim().min(2).max(30),
  model: z.string().trim().min(2).max(100),
}).strict().superRefine((value, context) => {
  if (!isAISelectionActivatable(value.provider, value.model)) {
    context.addIssue({ code: "custom", message: "Provider/model không được hỗ trợ." });
  }
});

export const aiRevisionSchema = z.coerce.number().int().positive();
export const promptLabQuestionSchema = z.string().trim().min(2).max(1_200);
