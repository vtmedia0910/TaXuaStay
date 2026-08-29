import { availabilityFreshnessState } from "@/features/availability/policy";
import type { AdminAvailabilityIssue, AdminInventoryRowDto } from "@/features/availability/types";

export function detectAdminAvailabilityIssues(input: {
  rooms: Array<{ id: string; name: string; quantity: number; is_active: boolean }>;
  rows: AdminInventoryRowDto[];
  expectedDates: string[];
  now?: Date;
}): AdminAvailabilityIssue[] {
  const now = input.now ?? new Date();
  const issues: AdminAvailabilityIssue[] = [];

  for (const room of input.rooms.filter((item) => item.is_active)) {
    const rows = input.rows.filter((row) => row.room_type_id === room.id);
    const dates = new Set(rows.map((row) => row.date));
    const missingCount = input.expectedDates.filter((date) => !dates.has(date)).length;
    if (missingCount) {
      issues.push({
        severity: "warning",
        code: "missing",
        room_type_id: room.id,
        message: rows.length
          ? `${room.name} thiếu dữ liệu ${missingCount}/${input.expectedDates.length} đêm sắp tới.`
          : `${room.name} chưa có dữ liệu cho ${input.expectedDates.length} đêm sắp tới.`,
      });
    }

    const staleCount = rows.filter((row) => availabilityFreshnessState(row.verified_at, now) === "needs_confirmation").length;
    if (staleCount) {
      issues.push({ severity: "warning", code: "stale", room_type_id: room.id, message: `${room.name} có ${staleCount} đêm cần xác nhận lại.` });
    }

    const soldOutCount = rows.filter((row) => row.available_quantity === 0 && ["live", "verified_today"].includes(availabilityFreshnessState(row.verified_at, now))).length;
    if (soldOutCount) {
      issues.push({ severity: "warning", code: "sold-out", room_type_id: room.id, message: `${room.name} đang ghi nhận hết phòng trong ${soldOutCount} đêm sắp tới.` });
    }

    if (rows.some((row) => row.available_quantity > room.quantity)) {
      issues.push({ severity: "error", code: "capacity", room_type_id: room.id, message: `${room.name} có tồn phòng vượt số phòng vật lý; cần kiểm tra dữ liệu database.` });
    }
  }

  return issues;
}
