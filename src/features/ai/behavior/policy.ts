import { z } from "zod";
import {
  AI_ANSWER_STYLES,
  AI_LANGUAGE_POLICIES,
  AI_SALES_POLICIES,
  AI_TONES,
  AI_UNCERTAINTY_POLICIES,
  AI_VERBOSITIES,
} from "@/features/ai/behavior/types";

const UNSAFE_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const CREDENTIAL_VALUE = /(sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})/i;
const SAFETY_OVERRIDE = /(ignore|bỏ\s*qua|phớt\s*lờ).{0,40}(system|core|quy\s*tắc|hướng\s*dẫn)|bypass.{0,30}(tool|safety)|truy\s*cập.{0,20}(sql|database|cơ\s*sở\s*dữ\s*liệu)|fabricate|bịa.{0,20}(giá|tình\s*trạng|xác\s*minh)|reveal.{0,20}(credential|secret|api.?key)|tiết\s*lộ.{0,20}(credential|bí\s*mật|api.?key)|mutate.{0,20}(booking|payment|supplier|telegram)|sửa.{0,20}(booking|thanh\s*toán|supplier|telegram)/i;

function safeText(min: number, max: number) {
  return z.string().trim().min(min).max(max).refine((value) => !UNSAFE_CONTROL.test(value), "Không dùng ký tự điều khiển.");
}

function safeBehaviorText(min: number, max: number) {
  return safeText(min, max)
    .refine((value) => !CREDENTIAL_VALUE.test(value), "Không lưu credential trong profile.")
    .refine((value) => !SAFETY_OVERRIDE.test(value), "Nội dung xung đột với lớp an toàn bắt buộc.");
}

export const behaviorProfileInputSchema = z.object({
  profile_key: z.string().uuid().optional(),
  name: safeBehaviorText(2, 80),
  role_description: safeBehaviorText(10, 600),
  persona: safeBehaviorText(10, 600),
  tone: z.enum(AI_TONES),
  verbosity: z.enum(AI_VERBOSITIES),
  answer_style: z.enum(AI_ANSWER_STYLES),
  language_policy: z.enum(AI_LANGUAGE_POLICIES),
  sales_policy: z.enum(AI_SALES_POLICIES),
  uncertainty_policy: z.enum(AI_UNCERTAINTY_POLICIES),
  custom_instructions: safeBehaviorText(0, 2_000),
}).strict();

export function validateStoredBehaviorProfile(value: unknown) {
  return behaviorProfileInputSchema.omit({ profile_key: true }).safeParse(value);
}
