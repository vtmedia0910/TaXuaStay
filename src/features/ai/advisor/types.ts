import { z } from "zod";

export const ADVISOR_STATE_VERSION = "phase13e-v1" as const;

export const CONSULTATION_STAGES = [
  "DISCOVER",
  "UNDERSTAND",
  "NARROW",
  "COMPARE",
  "RECOMMEND",
  "DECIDE",
  "NEXT_ACTION",
] as const;

export const ADVISOR_INTENTS = [
  "greeting",
  "thanks",
  "goodbye",
  "capability",
  "recommendation",
  "comparison",
  "availability",
  "price",
  "road",
  "package",
  "motorbike",
  "booking_status",
  "policy",
  "action",
  "general",
] as const;

export const ADVISOR_QUESTION_FIELDS = [
  "dates",
  "guests",
  "priority",
  "budget",
  "transport",
  "target",
  "options",
] as const;

export const ADVISOR_PRIORITY_TAGS = [
  "cloud_view",
  "quiet",
  "easy_access",
  "private_room",
  "budget",
  "verified",
  "couple",
] as const;

const nullableBoolean = z.boolean().nullable();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Ngày không hợp lệ").nullable();
const publicReference = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/).max(220);

export const advisorOptionReferenceSchema = z.object({
  kind: z.enum(["room", "property", "package", "motorbike"]),
  publicSlug: publicReference,
  label: z.string().trim().min(1).max(140),
  priceVnd: z.number().int().min(0).max(100_000_000).nullable().optional(),
}).strict();

export const advisorStateSchema = z.object({
  version: z.literal(ADVISOR_STATE_VERSION),
  trip: z.object({
    destination: z.literal("ta-xua"),
    checkIn: isoDate,
    checkOut: isoDate,
    guestCount: z.number().int().min(1).max(20).nullable(),
    roomCount: z.number().int().min(1).max(10).nullable(),
  }).strict(),
  budget: z.object({
    minVnd: z.number().int().min(0).max(100_000_000).nullable(),
    maxVnd: z.number().int().min(0).max(100_000_000).nullable(),
    unit: z.enum(["per_night", "trip"]).nullable(),
  }).strict(),
  transport: z.object({
    mode: z.enum(["car", "motorbike", "bus", "unknown"]).nullable(),
    roadTolerance: z.enum(["low", "medium", "high"]).nullable(),
  }).strict(),
  preferences: z.object({
    cloudView: nullableBoolean,
    quiet: nullableBoolean,
    privateRoom: nullableBoolean,
    coupleTrip: nullableBoolean,
    priorityTags: z.array(z.enum(ADVISOR_PRIORITY_TAGS)).max(5),
  }).strict(),
  consultation: z.object({
    stage: z.enum(CONSULTATION_STAGES),
    lastIntent: z.enum(ADVISOR_INTENTS),
    askedFields: z.array(z.enum(ADVISOR_QUESTION_FIELDS)).max(7),
  }).strict(),
  lastPresentedOptions: z.array(advisorOptionReferenceSchema).max(5),
  selectedOption: advisorOptionReferenceSchema.nullable(),
}).strict().superRefine((value, context) => {
  if (value.trip.checkIn && value.trip.checkOut && value.trip.checkOut <= value.trip.checkIn) {
    context.addIssue({ code: "custom", path: ["trip", "checkOut"], message: "Ngày trả phòng phải sau ngày nhận phòng." });
  }
  if (value.budget.minVnd !== null && value.budget.maxVnd !== null && value.budget.minVnd > value.budget.maxVnd) {
    context.addIssue({ code: "custom", path: ["budget", "maxVnd"], message: "Ngân sách tối đa phải lớn hơn tối thiểu." });
  }
});

export const assistantAdvisorResponseSchema = z.object({
  statePatch: advisorStateSchema,
  stage: z.enum(CONSULTATION_STAGES),
  suggestedReplies: z.array(z.string().trim().min(1).max(100)).max(3),
}).strict();

export type ConsultationStage = (typeof CONSULTATION_STAGES)[number];
export type AdvisorIntent = (typeof ADVISOR_INTENTS)[number];
export type AdvisorQuestionField = (typeof ADVISOR_QUESTION_FIELDS)[number];
export type AdvisorOptionReference = z.infer<typeof advisorOptionReferenceSchema>;
export type AdvisorSessionState = z.infer<typeof advisorStateSchema>;
export type AssistantAdvisorResponse = z.infer<typeof assistantAdvisorResponseSchema>;

export function createDefaultAdvisorState(): AdvisorSessionState {
  return {
    version: ADVISOR_STATE_VERSION,
    trip: { destination: "ta-xua", checkIn: null, checkOut: null, guestCount: null, roomCount: null },
    budget: { minVnd: null, maxVnd: null, unit: null },
    transport: { mode: null, roadTolerance: null },
    preferences: { cloudView: null, quiet: null, privateRoom: null, coupleTrip: null, priorityTags: [] },
    consultation: { stage: "DISCOVER", lastIntent: "general", askedFields: [] },
    lastPresentedOptions: [],
    selectedOption: null,
  };
}

export function parseAdvisorState(value: unknown): AdvisorSessionState {
  const parsed = advisorStateSchema.safeParse(value);
  return parsed.success ? parsed.data : createDefaultAdvisorState();
}
