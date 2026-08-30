import type { CmsMediaRole, CmsPageKey } from "@/features/cms/types";

export const CMS_SECTION_LABELS: Record<string, string> = {
  hero: "Hero đầu trang",
  why_choose_us: "Vì sao có Tà Xùa Trip",
  differentiators: "Chúng tôi làm gì khác?",
  verified_rooms: "Homestay & phòng đã thẩm định",
  services: "Dịch vụ cho chuyến đi",
  how_we_verify: "Phương pháp thẩm định",
  cloud_view: "Cloud View",
  brand_statement: "Nguyên tắc thương hiệu",
  final_cta: "CTA cuối trang",
  stay_intro: "Mở đầu trang Lưu trú",
  stay_notes: "Thông tin cần lưu ý",
  footer_intro: "Giới thiệu chân trang",
  footer_links: "Liên kết chân trang",
  faq_list: "Câu hỏi thường gặp",
};

export const CMS_SECTION_TYPE_LABELS: Record<string, string> = {
  hero: "Hero",
  feature_grid: "Danh sách nội dung",
  dynamic_room_grid: "Dữ liệu tự động",
  service_grid: "Danh sách dịch vụ",
  text: "Nội dung",
  cta: "CTA",
  link_list: "Danh sách liên kết",
  faq: "Hỏi đáp",
};

export const CMS_MEDIA_ROLE_LABELS: Record<CmsMediaRole, string> = {
  hero: "Ảnh Hero",
  card: "Ảnh thẻ nội dung",
  gallery: "Thư viện ảnh",
  banner: "Banner",
  og: "Ảnh chia sẻ mạng xã hội",
  icon: "Icon",
  general: "Ảnh dùng chung",
};

export const CMS_PAGE_LABELS: Record<CmsPageKey, string> = {
  home: "Trang chủ",
  stay: "Lưu trú",
  verified: "Phương pháp thẩm định",
  footer: "Chân trang",
  faq: "Câu hỏi thường gặp",
};

export function getCmsSectionLabel(key: string) {
  return CMS_SECTION_LABELS[key] ?? "Mục nội dung";
}

export function getCmsSectionTypeLabel(type: string) {
  return CMS_SECTION_TYPE_LABELS[type] ?? "Nội dung";
}

export function formatCmsDate(value: string | null | undefined) {
  if (!value) return "Chưa xuất bản";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}
