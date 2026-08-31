import { z } from "zod";
import {
  CONTACT_TYPES,
  EDITABLE_SUPPLIER_STATUSES,
  PARTNER_STATUSES,
  PARTNER_TIERS,
  PROPERTY_RELATIONSHIP_TYPES,
  SUPPLIER_STATUSES,
  SUPPLIER_TYPES,
} from "@/features/suppliers/types";
import { blankToNull, formCheckbox, optionalHttpsUrl, optionalText } from "@/lib/validation";

const optionalId = z.preprocess(blankToNull, z.uuid().nullable());
const optionalDate = z.preprocess(blankToNull, z.iso.date().nullable());
const optionalEmail = z.preprocess(blankToNull, z.email().max(254).nullable());
const optionalMetadata = z.preprocess(blankToNull, z.string().max(8192).nullable());

export const supplierCodeSchema = z.string().trim().toUpperCase().regex(/^SUP-[A-Z0-9]{2,8}-[0-9]{4,8}$/);

export const supplierProfileSchema = z.object({
  id: optionalId,
  supplier_code: supplierCodeSchema,
  supplier_type: z.enum(SUPPLIER_TYPES),
  display_name: z.string().trim().min(2).max(160),
  legal_name: optionalText(200),
  status: z.enum(EDITABLE_SUPPLIER_STATUSES),
  tax_code: optionalText(50),
  website_url: optionalHttpsUrl,
  internal_notes: optionalText(10000),
  primary_contact_id: optionalId,
  primary_contact_name: optionalText(160),
  primary_contact_type: z.preprocess(blankToNull, z.enum(CONTACT_TYPES).nullable()),
  primary_role_title: optionalText(120),
  primary_phone: optionalText(30),
  primary_email: optionalEmail,
  primary_zalo: optionalText(160),
  primary_notes_internal: optionalText(5000),
}).superRefine((value, context) => {
  const hasPrimaryMethod = Boolean(value.primary_phone || value.primary_email || value.primary_zalo);
  if (hasPrimaryMethod && !value.primary_contact_name) {
    context.addIssue({ code: "custom", path: ["primary_contact_name"], message: "Liên hệ chính cần có tên." });
  }
  if (hasPrimaryMethod && !value.primary_contact_type) {
    context.addIssue({ code: "custom", path: ["primary_contact_type"], message: "Chọn loại liên hệ chính." });
  }
  if (!hasPrimaryMethod && (value.primary_contact_name || value.primary_contact_type || value.primary_role_title)) {
    context.addIssue({ code: "custom", path: ["primary_phone"], message: "Liên hệ cần số điện thoại, email hoặc Zalo." });
  }
});

export const supplierContactSchema = z.object({
  id: optionalId,
  supplier_id: z.uuid(),
  contact_name: z.string().trim().min(2).max(160),
  contact_type: z.enum(CONTACT_TYPES),
  role_title: optionalText(120),
  phone: optionalText(30),
  email: optionalEmail,
  zalo: optionalText(160),
  notes_internal: optionalText(5000),
  is_primary: formCheckbox,
  is_active: formCheckbox,
}).superRefine((value, context) => {
  if (!value.phone && !value.email && !value.zalo) {
    context.addIssue({ code: "custom", path: ["phone"], message: "Cần ít nhất điện thoại, email hoặc Zalo." });
  }
  if (value.is_primary && !value.is_active) {
    context.addIssue({ code: "custom", path: ["is_active"], message: "Liên hệ chính phải đang hoạt động." });
  }
});

export const supplierPropertySchema = z.object({
  id: optionalId,
  supplier_id: z.uuid(),
  property_id: z.uuid(),
  relationship_type: z.enum(PROPERTY_RELATIONSHIP_TYPES),
  is_primary: formCheckbox,
  valid_from: optionalDate,
  valid_until: optionalDate,
  notes_internal: optionalText(5000),
}).refine((value) => !value.valid_from || !value.valid_until || value.valid_until >= value.valid_from, {
  path: ["valid_until"],
  message: "Ngày kết thúc phải từ ngày bắt đầu trở đi.",
});

export const partnerRelationshipSchema = z.object({
  id: optionalId,
  supplier_id: z.uuid(),
  status: z.enum(PARTNER_STATUSES),
  tier: z.enum(PARTNER_TIERS),
  started_at: optionalDate,
  reviewed_at: optionalDate,
  valid_until: optionalDate,
  ended_at: optionalDate,
  relationship_notes_internal: optionalText(10000),
}).superRefine((value, context) => {
  if (value.started_at && value.valid_until && value.valid_until < value.started_at) {
    context.addIssue({ code: "custom", path: ["valid_until"], message: "Hiệu lực không được kết thúc trước ngày bắt đầu." });
  }
  if (value.reviewed_at && value.reviewed_at > new Date().toISOString().slice(0, 10)) {
    context.addIssue({ code: "custom", path: ["reviewed_at"], message: "Ngày rà soát không được ở tương lai." });
  }
  if (value.status !== "ended" && value.ended_at) {
    context.addIssue({ code: "custom", path: ["ended_at"], message: "Chỉ quan hệ đã kết thúc mới có ngày kết thúc." });
  }
});

export const supplierExternalRefSchema = z.object({
  id: optionalId,
  supplier_id: z.uuid(),
  system_key: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_]{1,79}$/),
  external_reference: z.string().trim().min(1).max(200),
  metadata: optionalMetadata.transform((value, context) => {
    if (!value) return {} as Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(value);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("not-object");
      return parsed as Record<string, unknown>;
    } catch {
      context.addIssue({ code: "custom", message: "Metadata phải là JSON object hợp lệ." });
      return z.NEVER;
    }
  }),
  is_active: formCheckbox,
});

export const supplierQuerySchema = z.object({
  query: z.string().trim().max(100).default(""),
  type: z.enum(["all", ...SUPPLIER_TYPES]).default("all"),
  status: z.enum(["all", ...SUPPLIER_STATUSES]).default("all"),
  partner: z.enum(["all", ...PARTNER_STATUSES, "none"]).default("all"),
});

export const supplierIdSchema = z.uuid();
