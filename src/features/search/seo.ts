import type { RoomSearchParams, SearchPreset } from "@/features/search/types";
import { DEFAULT_ROOM_SEARCH_PARAMS } from "@/features/search/params";

export interface SeoLandingConfig {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  criteria: string;
  note?: string;
  searchContext?: Partial<RoomSearchParams>;
  preset: SearchPreset;
  related: string[];
}

export const SEO_LANDING_PAGES = {
  "homestay-ta-xua": {
    slug: "homestay-ta-xua",
    title: "Homestay Tà Xùa – Tìm phòng theo nhu cầu",
    description: "Khám phá loại phòng tại các homestay Tà Xùa theo sức chứa, tiện nghi và thông tin thực tế đang được công khai.",
    h1: "Homestay Tà Xùa theo nhu cầu phòng",
    intro: "Danh sách bắt đầu từ loại phòng, giúp bạn đối chiếu sức chứa, phòng tắm, view cơ bản và tiện nghi trước khi mở chi tiết homestay.",
    criteria: "Chỉ hiển thị room type đã xuất bản thuộc property có loại homestay.",
    preset: { propertyTypes: ["homestay"] },
    related: ["homestay-san-may-ta-xua", "homestay-cho-couple-ta-xua", "homestay-cho-nhom-ta-xua"],
  },
  "homestay-san-may-ta-xua": {
    slug: "homestay-san-may-ta-xua",
    title: "Homestay săn mây Tà Xùa – Xem thông tin view phòng",
    description: "Tổng hợp phòng tại Tà Xùa có dữ liệu view núi hoặc thung lũng; chưa phải kết quả Cloud View Verified.",
    h1: "Phòng có thông tin view núi hoặc thung lũng",
    intro: "Các phòng có thông tin view núi/thung lũng đang được tổng hợp để bạn xem đúng room type trước chuyến đi.",
    criteria: "Lọc theo trường view_type hiện có: mountain hoặc valley.",
    note: "Thông tin này chưa phải Cloud View Verified và không bảo đảm có mây. Phase 4 sẽ bổ sung bằng chứng cùng rubric kiểm chứng riêng.",
    preset: { viewTypes: ["mountain", "valley"] },
    related: ["homestay-ta-xua-view-dep", "homestay-ta-xua", "homestay-co-cho-do-o-to-ta-xua"],
  },
  "homestay-ta-xua-view-dep": {
    slug: "homestay-ta-xua-view-dep",
    title: "Homestay Tà Xùa view đẹp – Xem dữ liệu view thực tế",
    description: "Xem room type có dữ liệu view núi hoặc thung lũng, với cách diễn đạt thận trọng trước Phase 4 Verified Standard.",
    h1: "Room type có dữ liệu view mở tại Tà Xùa",
    intro: "Trang này dùng trường view cơ bản của từng room type, không dùng điểm số, xếp hạng hay trạng thái Cloud View Verified.",
    criteria: "Lọc minh bạch theo view_type mountain hoặc valley của phòng đã xuất bản.",
    note: "Thông tin hiện tại chưa phải Cloud View Verified. Ảnh chỉ là media đã duyệt công khai; Cloud View Score và vị trí ngắm thực tế thuộc Phase 4.",
    preset: { viewTypes: ["mountain", "valley"] },
    related: ["homestay-san-may-ta-xua", "homestay-cho-couple-ta-xua", "homestay-ta-xua"],
  },
  "homestay-cho-couple-ta-xua": {
    slug: "homestay-cho-couple-ta-xua",
    title: "Phòng Tà Xùa cho 2 khách – Xem room type phù hợp",
    description: "Tìm room type có sức chứa khoảng hai khách và phòng tắm riêng hoặc khép kín bằng tiêu chí dữ liệu minh bạch.",
    h1: "Phòng theo nhu cầu 2 khách tại Tà Xùa",
    intro: "Kết quả dùng sức chứa tối đa khoảng hai khách cùng dữ liệu phòng tắm riêng/khép kín; đây không phải nhãn marketing chủ quan.",
    criteria: "max_guests không quá 2; bathroom_type là private hoặc ensuite.",
    searchContext: { adults: 2, children: 0 },
    preset: { maxGuests: 2, bathroomTypes: ["private", "ensuite"] },
    related: ["homestay-ta-xua-view-dep", "homestay-ta-xua", "homestay-co-cho-do-o-to-ta-xua"],
  },
  "homestay-cho-nhom-ta-xua": {
    slug: "homestay-cho-nhom-ta-xua",
    title: "Phòng Tà Xùa cho nhóm – Tìm theo sức chứa",
    description: "Khám phá room type tại Tà Xùa có sức chứa từ bốn khách, không suy đoán số phòng còn trống theo ngày.",
    h1: "Room type cho nhu cầu nhóm từ 4 khách",
    intro: "Danh sách dựa trên max_guests đã ghi nhận của room type để nhóm bạn thu hẹp lựa chọn trước khi xác nhận trực tiếp.",
    criteria: "max_guests từ 4 trở lên; availability theo ngày chưa được triển khai.",
    searchContext: { adults: 4, children: 0 },
    preset: { minGuests: 4 },
    related: ["homestay-ta-xua", "homestay-co-cho-do-o-to-ta-xua", "khach-san-ta-xua"],
  },
  "homestay-co-cho-do-o-to-ta-xua": {
    slug: "homestay-co-cho-do-o-to-ta-xua",
    title: "Homestay Tà Xùa có chỗ đỗ ô tô – Dữ liệu đã ghi nhận",
    description: "Xem room type thuộc nơi lưu trú đang ghi nhận ô tô tiếp cận và có chỗ đỗ xe; chưa phải Road Verified.",
    h1: "Nơi lưu trú ghi nhận ô tô vào được và có chỗ đỗ",
    intro: "Chỉ những property có car_access = yes và parking = yes mới xuất hiện; trạng thái chưa xác nhận không được coi là có.",
    criteria: "car_access = yes và parking = yes trong dữ liệu hiện tại.",
    note: "Đây là thông tin tiếp cận đã ghi nhận, chưa phải đánh giá Road Verified về mặt đường, độ dốc hoặc đoạn hẹp.",
    preset: { carAccess: "yes", parking: "yes" },
    related: ["homestay-ta-xua", "homestay-cho-nhom-ta-xua", "khach-san-ta-xua"],
  },
  "khach-san-ta-xua": {
    slug: "khach-san-ta-xua",
    title: "Khách sạn Tà Xùa – Xem phòng và thông tin thực tế",
    description: "Khám phá room type tại các property được phân loại khách sạn ở Tà Xùa, không trộn homestay vào kết quả chính.",
    h1: "Khách sạn Tà Xùa theo room type",
    intro: "Kết quả chính chỉ lấy property_type = hotel để bạn xem sức chứa, tiện nghi và thông tin phòng đang công khai.",
    criteria: "Chỉ property có property_type = hotel.",
    preset: { propertyTypes: ["hotel"] },
    related: ["homestay-ta-xua", "homestay-cho-nhom-ta-xua", "homestay-co-cho-do-o-to-ta-xua"],
  },
} satisfies Record<string, SeoLandingConfig>;

export type SeoLandingSlug = keyof typeof SEO_LANDING_PAGES;
export const SEO_LANDING_SLUGS = Object.keys(SEO_LANDING_PAGES) as SeoLandingSlug[];

export function getSeoLandingConfig(slug: string) {
  return SEO_LANDING_PAGES[slug as SeoLandingSlug] as SeoLandingConfig | undefined;
}

export function getSeoLandingSearchParams(config: SeoLandingConfig, page: number) {
  return {
    ...DEFAULT_ROOM_SEARCH_PARAMS,
    ...config.searchContext,
    page,
  } satisfies RoomSearchParams;
}

export function buildSeoLandingPageUrl(slug: string, page: number) {
  return page > 1 ? `/${slug}?page=${page}` : `/${slug}`;
}
