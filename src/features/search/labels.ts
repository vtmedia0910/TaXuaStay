import type { AccessCertainty, PropertyType } from "@/features/properties/types";
import type { BathroomType, ViewType } from "@/features/rooms/types";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  homestay: "Homestay",
  bungalow: "Bungalow",
  hotel: "Khách sạn",
  guesthouse: "Nhà nghỉ",
  glamping: "Glamping",
  other: "Loại khác",
};

export const BATHROOM_TYPE_LABELS: Record<BathroomType, string> = {
  private: "Riêng",
  shared: "Dùng chung",
  ensuite: "Khép kín",
  other: "Loại khác",
};

export const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  unknown: "Chưa xác nhận",
  mountain: "Núi",
  valley: "Thung lũng",
  garden: "Vườn",
  village: "Bản làng",
  courtyard: "Sân trong",
  none: "Không có view",
  other: "View khác",
};

export const ACCESS_FILTER_LABELS: Record<AccessCertainty, string> = {
  unknown: "Chưa xác nhận",
  yes: "Có",
  no: "Không",
};

export const ACCESS_FILTER_MARKS: Record<AccessCertainty, string> = {
  unknown: "?",
  yes: "✓",
  no: "✕",
};
