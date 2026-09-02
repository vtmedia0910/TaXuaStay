import { z } from "zod";
import { advisorStateSchema } from "@/features/ai/advisor/types";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1_200),
}).strict();

const publicSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);

export const assistantPageContextSchema = z.object({
  pageKind: z.enum(["home", "stay", "property", "room", "packages", "package", "motorbike", "motorbike_detail", "trip_finder", "other"]),
  pathname: z.string().regex(/^\/[a-z0-9\/-]*$/).max(320),
  destinationSlug: z.literal("ta-xua").optional(),
  propertySlug: publicSlugSchema.optional(),
  roomSlug: publicSlugSchema.optional(),
  packageSlug: publicSlugSchema.optional(),
  motorbikeSlug: publicSlugSchema.optional(),
}).strict().superRefine((value, context) => {
  const allowedByKind: Record<typeof value.pageKind, Array<keyof typeof value>> = {
    home: ["pageKind", "pathname", "destinationSlug"],
    stay: ["pageKind", "pathname", "destinationSlug"],
    property: ["pageKind", "pathname", "destinationSlug", "propertySlug"],
    room: ["pageKind", "pathname", "destinationSlug", "propertySlug", "roomSlug"],
    packages: ["pageKind", "pathname", "destinationSlug"],
    package: ["pageKind", "pathname", "destinationSlug", "packageSlug"],
    motorbike: ["pageKind", "pathname", "destinationSlug"],
    motorbike_detail: ["pageKind", "pathname", "destinationSlug", "motorbikeSlug"],
    trip_finder: ["pageKind", "pathname", "destinationSlug"],
    other: ["pageKind", "pathname"],
  };
  const allowed = new Set(allowedByKind[value.pageKind]);
  for (const key of ["destinationSlug", "propertySlug", "roomSlug", "packageSlug", "motorbikeSlug"] as const) {
    if (value[key] !== undefined && !allowed.has(key)) {
      context.addIssue({ code: "custom", path: [key], message: "Context field is not allowed for this page kind." });
    }
  }
  const expectedPath = value.pageKind === "home" ? "/"
    : value.pageKind === "stay" ? "/stay"
      : value.pageKind === "property" && value.propertySlug ? `/stay/${value.propertySlug}`
        : value.pageKind === "room" && value.propertySlug && value.roomSlug ? `/stay/${value.propertySlug}/${value.roomSlug}`
          : value.pageKind === "packages" ? "/packages"
            : value.pageKind === "package" && value.packageSlug ? `/packages/${value.packageSlug}`
              : value.pageKind === "motorbike" ? "/motorbike"
                : value.pageKind === "motorbike_detail" && value.motorbikeSlug ? `/motorbike/${value.motorbikeSlug}`
                  : value.pageKind === "trip_finder" ? "/trip-finder"
                    : value.pageKind === "other" ? value.pathname : null;
  if (!expectedPath || value.pathname !== expectedPath || (value.pageKind === "other" && /^(\/admin|\/assistant|\/auth|\/login|\/booking)(\/|$)/.test(value.pathname))) {
    context.addIssue({ code: "custom", path: ["pathname"], message: "Page context does not match an allowed public route." });
  }
});

export const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(1_200),
  history: z.array(messageSchema).max(6).default([]),
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/).optional(),
  entryPoint: z.enum(["assistant_page", "floating_assistant", "homepage_launcher", "booking_page", "unknown"]).default("unknown"),
  pageContext: assistantPageContextSchema.optional(),
  advisorState: advisorStateSchema.optional(),
}).strict();

export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
