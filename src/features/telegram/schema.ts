import { z } from "zod";
import { TELEGRAM_ASSIGNMENT_ROLES } from "@/features/telegram/types";

export const telegramSupplierIdSchema = z.uuid();
export const telegramChannelIdSchema = z.uuid();

export const telegramAssignmentSchema = z.object({
  supplier_id: z.uuid(),
  user_id: z.uuid(),
  assignment_role: z.enum(TELEGRAM_ASSIGNMENT_ROLES),
  is_active: z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean()),
});
export const telegramDisableSchema = z.object({
  channel_id: z.uuid(),
  supplier_id: z.uuid(),
  reason: z.string().trim().min(2).max(500),
});

export const telegramDispatchSchema = z.object({
  booking_id: z.uuid(),
  confirmation_id: z.uuid(),
  expected_confirmation_updated_at: z.iso.datetime({ offset: true }),
  expected_booking_revision: z.coerce.number().int().positive(),
  dispatch_mode: z.enum(["initial", "follow_up"]),
});

export const telegramTestSchema = z.object({
  channel_id: z.uuid(),
  supplier_id: z.uuid(),
  owner_authorization: z.literal("OWNER_AUTHORIZED_TELEGRAM_TEST"),
});

export const telegramDiscussionResolutionSchema = z.object({
  action_id: z.uuid(),
  booking_id: z.uuid(),
  expected_booking_revision: z.coerce.number().int().positive(),
  resolution_note: z.string().trim().min(2).max(500),
});

export const telegramWorkerSchema = z.object({
  limit: z.coerce.number().int().min(1).max(25).default(10),
});
