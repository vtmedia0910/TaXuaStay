"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { resolveVerificationDateSubmission } from "@/features/verification/policy";
import { verificationSchema } from "@/features/verification/schema";
import type { VerificationLifecycleSnapshot } from "@/features/verification/policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function vietnamLocalDateTime(value: string | null) {
  if (!value) return null;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return `${withSeconds}+07:00`;
}

export async function saveVerificationAction(formData: FormData) {
  await requireAdminUser();
  const parsed = verificationSchema.safeParse({
    id: formData.get("id"),
    verification_type: formData.get("verification_type"),
    status: formData.get("status"),
    property_id: formData.get("property_id"),
    room_type_id: formData.get("room_type_id"),
    physical_room_id: formData.get("physical_room_id"),
    method: formData.get("method"),
    notes: formData.get("notes"),
    verified_at: formData.get("verified_at"),
    expires_at: formData.get("expires_at"),
    use_custom_verification_dates: formData.get("use_custom_verification_dates"),
    evidence_ids: [...new Set(formData.getAll("evidence_ids"))],
    direct_valley_points: formData.get("direct_valley_points"),
    view_width_points: formData.get("view_width_points"),
    obstruction_points: formData.get("obstruction_points"),
    view_from_bed_points: formData.get("view_from_bed_points"),
    private_position_points: formData.get("private_position_points"),
    orientation_points: formData.get("orientation_points"),
    evidence_points: formData.get("evidence_points"),
    view_from_bed: formData.get("view_from_bed"),
    viewing_position: formData.get("viewing_position"),
    view_direction: formData.get("view_direction"),
    horizontal_view_angle_deg: formData.get("horizontal_view_angle_deg"),
    sunrise_orientation: formData.get("sunrise_orientation"),
    obstruction_notes: formData.get("obstruction_notes"),
    cloud_view_notes: formData.get("cloud_view_notes"),
    grade: formData.get("grade"),
    car_access: formData.get("car_access"),
    motorbike_access: formData.get("motorbike_access"),
    sedan_access: formData.get("sedan_access"),
    parking: formData.get("parking"),
    road_surface: formData.get("road_surface"),
    steepness_notes: formData.get("steepness_notes"),
    narrow_section_notes: formData.get("narrow_section_notes"),
    rain_risk_notes: formData.get("rain_risk_notes"),
    parking_location: formData.get("parking_location"),
    walk_from_parking_m: formData.get("walk_from_parking_m"),
    road_notes: formData.get("road_notes"),
    cleanliness_score: formData.get("cleanliness_score"),
    soundproof_score: formData.get("soundproof_score"),
    heating_score: formData.get("heating_score"),
    hot_water_score: formData.get("hot_water_score"),
    wifi_score: formData.get("wifi_score"),
    bathroom_score: formData.get("bathroom_score"),
    room_accuracy_score: formData.get("room_accuracy_score"),
    comfort_score: formData.get("comfort_score"),
    quality_notes_public: formData.get("quality_notes_public"),
    quality_notes_internal: formData.get("quality_notes_internal"),
  });

  if (!parsed.success) redirect("/admin/verification?error=invalid");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/verification?error=config");

  const value = parsed.data;
  let existingLifecycle: VerificationLifecycleSnapshot | null = null;
  if (value.id) {
    const { data, error } = await supabase
      .from("verification_records")
      .select("status,verified_at,expires_at")
      .eq("id", value.id)
      .maybeSingle()
      .overrideTypes<VerificationLifecycleSnapshot, { merge: false }>();
    if (error || !data) redirect("/admin/verification?error=verification-save");
    existingLifecycle = data;
  }

  const lifecycleDates = resolveVerificationDateSubmission({
    status: value.status,
    existing: existingLifecycle,
    submittedVerifiedAt: value.verified_at,
    submittedExpiresAt: value.expires_at,
    useCustomDates: value.use_custom_verification_dates,
  });
  const common = {
    target_verification_id: value.id ?? null,
    target_status: value.status,
    target_method: value.method,
    target_notes: value.notes,
    target_verified_at: vietnamLocalDateTime(lifecycleDates.verifiedAt),
    target_expires_at: vietnamLocalDateTime(lifecycleDates.expiresAt),
    selected_media_ids: value.evidence_ids,
  };

  let mutation;
  if (value.verification_type === "cloud_view") {
    mutation = supabase.rpc("save_cloud_view_verification", {
      ...common,
      target_room_type_id: value.room_type_id,
      target_physical_room_id: value.physical_room_id,
      target_direct_valley_points: value.direct_valley_points,
      target_view_width_points: value.view_width_points,
      target_obstruction_points: value.obstruction_points,
      target_view_from_bed_points: value.view_from_bed_points,
      target_private_position_points: value.private_position_points,
      target_orientation_points: value.orientation_points,
      target_evidence_points: value.evidence_points,
      target_view_from_bed: value.view_from_bed,
      target_viewing_position: value.viewing_position,
      target_view_direction: value.view_direction,
      target_horizontal_view_angle_deg: value.horizontal_view_angle_deg,
      target_sunrise_orientation: value.sunrise_orientation,
      target_obstruction_notes: value.obstruction_notes,
      target_cloud_view_notes: value.cloud_view_notes,
    });
  } else if (value.verification_type === "road_access") {
    mutation = supabase.rpc("save_road_verification", {
      ...common,
      target_property_id: value.property_id,
      target_grade: value.grade,
      target_car_access: value.car_access,
      target_motorbike_access: value.motorbike_access,
      target_sedan_access: value.sedan_access,
      target_parking: value.parking,
      target_road_surface: value.road_surface,
      target_steepness_notes: value.steepness_notes,
      target_narrow_section_notes: value.narrow_section_notes,
      target_rain_risk_notes: value.rain_risk_notes,
      target_parking_location: value.parking_location,
      target_walk_from_parking_m: value.walk_from_parking_m,
      target_road_notes: value.road_notes,
    });
  } else if (value.verification_type === "room_quality") {
    mutation = supabase.rpc("save_room_quality_verification", {
      ...common,
      target_room_type_id: value.room_type_id,
      target_physical_room_id: value.physical_room_id,
      target_cleanliness_score: value.cleanliness_score,
      target_soundproof_score: value.soundproof_score,
      target_heating_score: value.heating_score,
      target_hot_water_score: value.hot_water_score,
      target_wifi_score: value.wifi_score,
      target_bathroom_score: value.bathroom_score,
      target_room_accuracy_score: value.room_accuracy_score,
      target_comfort_score: value.comfort_score,
      target_notes_public: value.quality_notes_public,
      target_notes_internal: value.quality_notes_internal,
    });
  } else {
    mutation = supabase.rpc("save_basic_verification", {
      ...common,
      target_verification_type: value.verification_type,
      target_property_id: value.property_id,
      target_room_type_id: value.room_type_id,
      target_physical_room_id: value.physical_room_id,
    });
  }

  const { data, error } = await mutation.overrideTypes<string, { merge: false }>();
  if (error || !data) redirect("/admin/verification?error=verification-save");

  revalidatePath("/admin/verification");
  revalidatePath("/tim-phong");
  revalidatePath("/stay");
  revalidatePath("/homestay/[slug]", "page");
  revalidatePath("/homestay/[slug]/phong/[roomSlug]", "page");
  revalidatePath("/stay/[slug]", "page");
  revalidatePath("/stay/[slug]/[roomSlug]", "page");
  revalidatePath("/verified");
  redirect(`/admin/verification/${data}/edit?saved=1`);
}
