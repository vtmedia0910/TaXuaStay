import type {
  ContactType,
  PartnerStatus,
  PartnerTier,
  PropertyRelationshipType,
  SupplierStatus,
  SupplierType,
} from "@/features/suppliers/types";

export const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
  accommodation: "Lưu trú",
  motorbike: "Xe máy",
  bus: "Xe khách",
  transport: "Vận chuyển",
  activity: "Trải nghiệm",
  food: "Ẩm thực / dịch vụ ăn uống",
  guide: "Hướng dẫn viên",
  other: "Khác",
};

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  lead: "Tiềm năng",
  onboarding: "Đang tiếp nhận",
  active: "Đang hoạt động",
  paused: "Tạm dừng",
  inactive: "Ngừng hoạt động",
  archived: "Đã lưu trữ",
};

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  owner: "Chủ cơ sở",
  manager: "Quản lý",
  reservation: "Đặt phòng",
  operations: "Vận hành",
  accounting: "Kế toán",
  emergency: "Khẩn cấp",
  other: "Khác",
};

export const PROPERTY_RELATIONSHIP_LABELS: Record<PropertyRelationshipType, string> = {
  owner: "Chủ sở hữu",
  operator: "Đơn vị vận hành",
  manager: "Đơn vị quản lý",
  reservation_partner: "Đầu mối đặt phòng",
  commercial_partner: "Đối tác thương mại",
  other: "Khác",
};

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  prospect: "Đang tìm hiểu",
  onboarding: "Đang thiết lập",
  active: "Đang hợp tác",
  paused: "Tạm dừng",
  ended: "Đã kết thúc",
};

export const PARTNER_TIER_POLICY: Record<PartnerTier, { label: string; meaning: string }> = {
  standard: { label: "Tiêu chuẩn", meaning: "Quan hệ cung ứng thông thường." },
  verified: { label: "Đã rà soát quan hệ", meaning: "Danh tính và đầu mối vận hành đã được rà soát nội bộ." },
  preferred: { label: "Ưu tiên hợp tác", meaning: "Mức độ phối hợp sâu hơn; không phải xếp hạng chất lượng." },
  cloud_partner: { label: "Cloud Partner", meaning: "Hợp tác riêng về nguồn cung Cloud/View; không tạo Cloud View Verified." },
  exclusive: { label: "Độc quyền", meaning: "Có phạm vi hợp tác độc quyền được ghi nhận; chưa bao gồm điều khoản kinh tế." },
};

export const PARTNER_TRUST_INVARIANT = [
  "Exact Room Verified",
  "Room Type Verified",
  "Cloud View",
  "Room Quality",
  "Road Verified",
  "Price Confidence",
  "Availability",
  "public search ranking",
] as const;
