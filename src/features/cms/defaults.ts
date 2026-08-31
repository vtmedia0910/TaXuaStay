import type { CmsPage, CmsPageKey, CmsSection } from "@/features/cms/types";

type SectionSeed = Omit<CmsSection, "id" | "page_id" | "items">;

const HOME_SECTIONS: SectionSeed[] = [
  { section_key: "hero", section_type: "hero", eyebrow: "TÀ XÙA TRIP", heading: "Đi thật. Biết trước.", body: "Thông tin thật về nơi ở, hành trình và trải nghiệm — để bạn biết rõ trước khi lên đường.", cta_label: "TÌM PHÒNG PHÙ HỢP", cta_href: "/stay", desktop_media_id: null, mobile_media_id: null, sort_order: 10, is_enabled: true, max_items: null },
  { section_key: "why_choose_us", section_type: "feature_grid", eyebrow: "Vì sao chọn chúng tôi?", heading: "Quyết định dễ hơn khi thông tin được tách rõ.", body: "Chúng tôi kiểm tra và tách từng thông tin để bạn tự chọn phương án phù hợp, kể cả khi câu trả lời hiện tại là “Chưa xác minh”.", cta_label: null, cta_href: null, desktop_media_id: null, mobile_media_id: null, sort_order: 20, is_enabled: true, max_items: null },
  { section_key: "differentiators", section_type: "feature_grid", eyebrow: "Chúng tôi làm gì khác?", heading: "Bắt đầu từ bằng chứng, không bắt đầu từ lời quảng cáo.", body: null, cta_label: null, cta_href: null, desktop_media_id: null, mobile_media_id: null, sort_order: 30, is_enabled: true, max_items: null },
  { section_key: "verified_rooms", section_type: "dynamic_room_grid", eyebrow: "Dữ liệu thật đang công khai", heading: "Homestay & phòng Tà Xùa đã thẩm định", body: "Chỉ hiển thị phòng có hồ sơ Cloud View còn hiệu lực trong dữ liệu công khai. Không có dữ liệu thì không tạo thẻ mẫu.", cta_label: "Xem toàn bộ Lưu trú", cta_href: "/stay", desktop_media_id: null, mobile_media_id: null, sort_order: 40, is_enabled: true, max_items: 3 },
  { section_key: "brand_statement", section_type: "text", eyebrow: "Nguyên tắc thương hiệu", heading: "Không bán cái đẹp. Bán cái phù hợp.", body: "Lựa chọn tốt không phải lúc nào cũng nổi bật nhất trên ảnh. Đó là lựa chọn phù hợp với cách bạn muốn đi và những điều bạn sẵn sàng đánh đổi.", cta_label: null, cta_href: null, desktop_media_id: null, mobile_media_id: null, sort_order: 80, is_enabled: true, max_items: null },
  { section_key: "final_cta", section_type: "cta", eyebrow: "Tà Xùa, trước khi bạn đến.", heading: "Phần phức tạp để chúng tôi lo.", body: "Bắt đầu bằng nơi lưu trú phù hợp. Các phần còn lại của chuyến sẽ chỉ được mở khi có dữ liệu và quy trình thật.", cta_label: "Bắt đầu tìm chuyến", cta_href: "/stay", desktop_media_id: null, mobile_media_id: null, sort_order: 90, is_enabled: true, max_items: null },
];

const STAY_SECTIONS: SectionSeed[] = [
  { section_key: "stay_intro", section_type: "hero", eyebrow: "LƯU TRÚ TÀ XÙA", heading: "Homestay Tà Xùa: xem phòng thật, view thật, giá rõ ràng", body: "Chọn theo đúng loại phòng, sức chứa và bằng chứng đã công khai. Khi có đủ ngày, hệ thống đối chiếu từng đêm; dữ liệu thiếu không bao giờ được xem là còn phòng.", cta_label: null, cta_href: null, desktop_media_id: null, mobile_media_id: null, sort_order: 10, is_enabled: true, max_items: null },
  { section_key: "stay_notes", section_type: "text", eyebrow: "THÔNG TIN CẦN LƯU Ý", heading: "Giá và tình trạng phòng là hai dữ liệu độc lập.", body: "Website chỉ hiển thị giá hoặc khả năng đáp ứng khi có dữ liệu tương ứng. Không suy luận từ dữ liệu thiếu.", cta_label: null, cta_href: null, desktop_media_id: null, mobile_media_id: null, sort_order: 20, is_enabled: true, max_items: null },
];

const FOOTER_SECTIONS: SectionSeed[] = [
  { section_key: "footer_intro", section_type: "text", eyebrow: null, heading: "Tà Xùa Trip", body: "Nền tảng du lịch địa phương giúp bạn biết rõ nơi ở, bằng chứng và điều cần lưu ý trước khi lên đường.", cta_label: null, cta_href: null, desktop_media_id: null, mobile_media_id: null, sort_order: 10, is_enabled: true, max_items: null },
];

const SECTIONS: Partial<Record<CmsPageKey, SectionSeed[]>> = { home: HOME_SECTIONS, stay: STAY_SECTIONS, footer: FOOTER_SECTIONS };

export function getDefaultCmsPage(pageKey: CmsPageKey): CmsPage {
  const meta = pageKey === "stay"
    ? { title: "Lưu trú Tà Xùa", seo_title: "Homestay Tà Xùa: Xem phòng, view thật & giá", seo_description: "Khám phá nơi lưu trú Tà Xùa theo đúng loại phòng, sức chứa, view đã ghi nhận, giá theo ngày và tình trạng phòng khi có dữ liệu." }
    : { title: "Tà Xùa Trip", seo_title: "Tà Xùa Trip | Đi thật. Biết trước.", seo_description: "Thẩm định nơi ở, bằng chứng và thông tin cần biết để chuẩn bị chuyến Tà Xùa rõ ràng hơn." };
  return {
    id: `fallback-${pageKey}`, page_key: pageKey, title: meta.title,
    seo_title: meta.seo_title, seo_description: meta.seo_description,
    og_media_id: null, published_at: null, og_media: null,
    sections: (SECTIONS[pageKey] ?? []).map((section) => ({ ...section, id: `fallback-${pageKey}-${section.section_key}`, page_id: `fallback-${pageKey}`, items: [] })),
  };
}
export function findCmsSection(page: CmsPage, sectionKey: string) {
  return page.sections.find((section) => section.section_key === sectionKey);
}
