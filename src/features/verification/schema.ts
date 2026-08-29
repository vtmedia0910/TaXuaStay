import { z } from "zod";
import { ACCESS_CERTAINTIES } from "@/features/properties/types";
import {
  ROAD_GRADES,
  ROAD_SURFACES,
  SUNRISE_ORIENTATIONS,
  VERIFICATION_STATUSES,
  VERIFICATION_TYPES,
  VIEW_DIRECTIONS,
  VIEW_FROM_BED_VALUES,
  VIEWING_POSITIONS,
} from "@/features/verification/types";
import { blankToNull, formCheckbox, optionalLocalDateTime, optionalNumber, optionalText } from "@/lib/validation";

const optionalUuid = z.preprocess(blankToNull, z.uuid().nullable());
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(blankToNull, z.enum(values).nullable());
const optionalInteger = (max: number) => optionalNumber(z.coerce.number().int().min(0).max(max));

export const verificationSchema = z
  .object({
    id: z.preprocess((value) => (value === "" ? undefined : value), z.uuid().optional()),
    verification_type: z.enum(VERIFICATION_TYPES),
    status: z.enum(VERIFICATION_STATUSES),
    property_id: optionalUuid,
    room_type_id: optionalUuid,
    physical_room_id: optionalUuid,
    method: z.string().trim().min(2).max(200),
    notes: optionalText(5000),
    verified_at: optionalLocalDateTime,
    expires_at: optionalLocalDateTime,
    use_custom_verification_dates: formCheckbox,
    evidence_ids: z.array(z.uuid()).max(100),
    direct_valley_points: optionalInteger(30),
    view_width_points: optionalInteger(20),
    obstruction_points: optionalInteger(15),
    view_from_bed_points: optionalInteger(15),
    private_position_points: optionalInteger(10),
    orientation_points: optionalInteger(5),
    evidence_points: optionalInteger(5),
    view_from_bed: optionalEnum(VIEW_FROM_BED_VALUES),
    viewing_position: optionalEnum(VIEWING_POSITIONS),
    view_direction: optionalEnum(VIEW_DIRECTIONS),
    horizontal_view_angle_deg: optionalNumber(z.coerce.number().min(0).max(360)),
    sunrise_orientation: optionalEnum(SUNRISE_ORIENTATIONS),
    obstruction_notes: optionalText(2000),
    cloud_view_notes: optionalText(3000),
    grade: optionalEnum(ROAD_GRADES),
    car_access: optionalEnum(ACCESS_CERTAINTIES),
    motorbike_access: optionalEnum(ACCESS_CERTAINTIES),
    sedan_access: optionalEnum(ACCESS_CERTAINTIES),
    parking: optionalEnum(ACCESS_CERTAINTIES),
    road_surface: optionalEnum(ROAD_SURFACES),
    steepness_notes: optionalText(2000),
    narrow_section_notes: optionalText(2000),
    rain_risk_notes: optionalText(2000),
    parking_location: optionalText(1000),
    walk_from_parking_m: optionalNumber(z.coerce.number().int().min(0)),
    road_notes: optionalText(3000),
  })
  .superRefine((value, context) => {
    const now = Date.now();
    const verifiedAt = value.verified_at
      ? new Date(`${value.verified_at}:00+07:00`).getTime()
      : null;
    const expiresAt = value.expires_at
      ? new Date(`${value.expires_at}:00+07:00`).getTime()
      : null;
    const propertyTarget = ["property_identity", "property_location", "road_access"].includes(value.verification_type);
    if (propertyTarget && (!value.property_id || value.room_type_id || value.physical_room_id)) {
      context.addIssue({ code: "custom", path: ["property_id"], message: "Loại xác minh này phải gắn đúng một nơi lưu trú." });
    }
    if (!propertyTarget && (value.property_id || [value.room_type_id, value.physical_room_id].filter(Boolean).length !== 1)) {
      context.addIssue({ code: "custom", path: ["room_type_id"], message: "Loại xác minh này phải gắn đúng một loại phòng hoặc một phòng cụ thể." });
    }

    if (value.status === "verified" && value.evidence_ids.length === 0) {
      context.addIssue({ code: "custom", path: ["evidence_ids"], message: "Trạng thái đã xác minh cần ít nhất một bằng chứng." });
    }

    if (verifiedAt !== null && verifiedAt > now) {
      context.addIssue({ code: "custom", path: ["verified_at"], message: "Ngày xác minh không được ở tương lai." });
    }

    if (verifiedAt !== null && expiresAt !== null) {
      if (expiresAt <= verifiedAt) {
        context.addIssue({ code: "custom", path: ["expires_at"], message: "Ngày hết hạn phải sau ngày xác minh." });
      }
    }

    if (value.use_custom_verification_dates) {
      if (value.status !== "verified") {
        context.addIssue({ code: "custom", path: ["use_custom_verification_dates"], message: "Ngày tùy chỉnh chỉ dùng khi xác minh hồ sơ." });
      }
      if (verifiedAt === null) {
        context.addIssue({ code: "custom", path: ["verified_at"], message: "Hãy nhập ngày xác minh tùy chỉnh." });
      }
      if (expiresAt === null) {
        context.addIssue({ code: "custom", path: ["expires_at"], message: "Hãy nhập ngày hết hạn tùy chỉnh." });
      } else if (expiresAt <= now) {
        context.addIssue({ code: "custom", path: ["expires_at"], message: "Hồ sơ verified phải có ngày hết hạn trong tương lai." });
      }
    }

    if (value.verification_type === "cloud_view") {
      const requiredCloudFields = [
        "direct_valley_points", "view_width_points", "obstruction_points",
        "view_from_bed_points", "private_position_points", "orientation_points",
        "evidence_points", "view_from_bed", "viewing_position", "view_direction",
        "sunrise_orientation",
      ] as const;
      for (const field of requiredCloudFields) {
        if (value[field] === null) {
          context.addIssue({ code: "custom", path: [field], message: "Trường Cloud View này là bắt buộc." });
        }
      }
      if (value.view_from_bed === "no" && value.view_from_bed_points !== 0) {
        context.addIssue({ code: "custom", path: ["view_from_bed_points"], message: "Không có view từ giường phải có 0 điểm." });
      }
      if (value.view_from_bed === "partial" && (value.view_from_bed_points === null || value.view_from_bed_points < 1 || value.view_from_bed_points > 10)) {
        context.addIssue({ code: "custom", path: ["view_from_bed_points"], message: "View một phần từ giường phải có từ 1 đến 10 điểm." });
      }
      if (value.view_from_bed === "yes" && (value.view_from_bed_points === null || value.view_from_bed_points < 10 || value.view_from_bed_points > 15)) {
        context.addIssue({ code: "custom", path: ["view_from_bed_points"], message: "View trực tiếp từ giường phải có từ 10 đến 15 điểm." });
      }
      if (value.view_from_bed && value.view_from_bed !== "no" && ["shared", "none"].includes(value.viewing_position ?? "")) {
        context.addIssue({ code: "custom", path: ["viewing_position"], message: "View từ giường không thể dùng vị trí chung hoặc không có vị trí ngắm." });
      }
    }

    if (value.verification_type === "road_access") {
      const requiredRoadFields = [
        "grade", "car_access", "motorbike_access", "sedan_access", "parking", "road_surface",
      ] as const;
      for (const field of requiredRoadFields) {
        if (value[field] === null) {
          context.addIssue({ code: "custom", path: [field], message: "Trường Road Verified này là bắt buộc." });
        }
      }
      if (value.grade === "d" && (value.car_access !== "no" || value.sedan_access !== "no")) {
        context.addIssue({ code: "custom", path: ["grade"], message: "Grade D yêu cầu ô tô và sedan không vào trực tiếp." });
      }
    }
  });

export type VerificationInput = z.infer<typeof verificationSchema>;
