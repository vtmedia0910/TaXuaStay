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
    description: "Khám phá các loại phòng tại homestay Tà Xùa theo sức chứa, tiện nghi và thông tin thực tế đang được công khai.",
    h1: "Homestay Tà Xùa theo nhu cầu phòng",
    intro: "Danh sách bắt đầu từ từng loại phòng, giúp bạn đối chiếu sức chứa, phòng tắm, hướng nhìn và tiện nghi trước khi xem chi tiết homestay.",
    criteria: "Chỉ hiển thị các loại phòng đang được công khai tại nơi lưu trú thuộc nhóm homestay.",
    preset: { propertyTypes: ["homestay"] },
    related: ["homestay-san-may-ta-xua", "homestay-cho-couple-ta-xua", "homestay-cho-nhom-ta-xua"],
  },
  "homestay-san-may-ta-xua": {
    slug: "homestay-san-may-ta-xua",
    title: "Homestay săn mây Tà Xùa – Xem hướng nhìn từ phòng",
    description: "Tổng hợp phòng tại Tà Xùa có thông tin hướng nhìn ra núi hoặc thung lũng; chưa được thẩm định theo tiêu chuẩn Cloud View.",
    h1: "Phòng có hướng nhìn ra núi hoặc thung lũng",
    intro: "Các phòng có thông tin hướng nhìn ra núi hoặc thung lũng được tổng hợp để bạn xem đúng loại phòng trước chuyến đi.",
    criteria: "Chỉ chọn phòng có hướng nhìn đã ghi nhận là núi hoặc thung lũng.",
    note: "Thông tin hướng nhìn hiện tại chưa được thẩm định theo tiêu chuẩn Cloud View và không bảo đảm có mây. Vui lòng xem ảnh và xác nhận thêm với nơi lưu trú.",
    preset: { viewTypes: ["mountain", "valley"] },
    related: ["homestay-ta-xua-view-dep", "homestay-ta-xua", "homestay-co-cho-do-o-to-ta-xua"],
  },
  "homestay-ta-xua-view-dep": {
    slug: "homestay-ta-xua-view-dep",
    title: "Homestay Tà Xùa view đẹp – Xem thông tin hướng nhìn",
    description: "Xem các loại phòng có thông tin hướng nhìn ra núi hoặc thung lũng, không dùng điểm số hay xếp hạng chưa được kiểm chứng.",
    h1: "Phòng có thông tin hướng nhìn thoáng tại Tà Xùa",
    intro: "Trang này dựa trên hướng nhìn cơ bản đã ghi nhận cho từng loại phòng, không dùng điểm số, xếp hạng hay nhãn Cloud View đã thẩm định.",
    criteria: "Chỉ chọn phòng đang công khai có hướng nhìn đã ghi nhận là núi hoặc thung lũng.",
    note: "Thông tin hiện tại chưa được thẩm định theo tiêu chuẩn Cloud View. Ảnh hiển thị là ảnh đã duyệt công khai; chưa có điểm Cloud View hoặc vị trí ngắm đã kiểm chứng.",
    preset: { viewTypes: ["mountain", "valley"] },
    related: ["homestay-san-may-ta-xua", "homestay-cho-couple-ta-xua", "homestay-ta-xua"],
  },
  "homestay-cho-couple-ta-xua": {
    slug: "homestay-cho-couple-ta-xua",
    title: "Phòng Tà Xùa cho 2 khách – Xem loại phòng phù hợp",
    description: "Tìm loại phòng có sức chứa khoảng hai khách và phòng tắm riêng hoặc khép kín bằng tiêu chí thông tin minh bạch.",
    h1: "Phòng theo nhu cầu 2 khách tại Tà Xùa",
    intro: "Kết quả dùng sức chứa tối đa khoảng hai khách cùng thông tin phòng tắm riêng/khép kín; đây không phải nhãn marketing chủ quan.",
    criteria: "Sức chứa tối đa 2 khách và phòng tắm riêng hoặc khép kín.",
    searchContext: { adults: 2, children: 0 },
    preset: { maxGuests: 2, bathroomTypes: ["private", "ensuite"] },
    related: ["homestay-ta-xua-view-dep", "homestay-ta-xua", "homestay-co-cho-do-o-to-ta-xua"],
  },
  "homestay-cho-nhom-ta-xua": {
    slug: "homestay-cho-nhom-ta-xua",
    title: "Phòng Tà Xùa cho nhóm – Tìm theo sức chứa",
    description: "Khám phá các loại phòng tại Tà Xùa có sức chứa từ bốn khách, không suy đoán số phòng còn trống theo ngày.",
    h1: "Loại phòng cho nhu cầu nhóm từ 4 khách",
    intro: "Danh sách dựa trên sức chứa tối đa đã ghi nhận của từng loại phòng để nhóm bạn thu hẹp lựa chọn trước khi xác nhận trực tiếp.",
    criteria: "Sức chứa tối đa từ 4 khách; tình trạng phòng theo ngày vẫn cần được xác nhận trực tiếp.",
    searchContext: { adults: 4, children: 0 },
    preset: { minGuests: 4 },
    related: ["homestay-ta-xua", "homestay-co-cho-do-o-to-ta-xua", "khach-san-ta-xua"],
  },
  "homestay-co-cho-do-o-to-ta-xua": {
    slug: "homestay-co-cho-do-o-to-ta-xua",
    title: "Homestay Tà Xùa có chỗ đỗ ô tô – Thông tin hiện có",
    description: "Xem các loại phòng tại nơi lưu trú đang ghi nhận ô tô tiếp cận và có chỗ đỗ xe; thông tin đường vào chưa được kiểm chứng đầy đủ.",
    h1: "Nơi lưu trú ghi nhận ô tô vào được và có chỗ đỗ",
    intro: "Chỉ những nơi lưu trú đã ghi nhận ô tô vào được và có chỗ đỗ mới xuất hiện; trạng thái chưa xác nhận không được coi là có.",
    criteria: "Chỉ hiển thị nơi lưu trú đã ghi nhận ô tô vào được và có chỗ đỗ xe.",
    note: "Đây là thông tin tiếp cận hiện có, chưa phải đánh giá đường vào đã kiểm chứng đầy đủ về mặt đường, độ dốc hoặc đoạn hẹp.",
    preset: { carAccess: "yes", parking: "yes" },
    related: ["homestay-ta-xua", "homestay-cho-nhom-ta-xua", "khach-san-ta-xua"],
  },
  "khach-san-ta-xua": {
    slug: "khach-san-ta-xua",
    title: "Khách sạn Tà Xùa – Xem phòng và thông tin thực tế",
    description: "Khám phá các loại phòng tại nơi lưu trú được phân loại là khách sạn ở Tà Xùa, không trộn homestay vào kết quả chính.",
    h1: "Khách sạn Tà Xùa theo loại phòng",
    intro: "Kết quả chính chỉ gồm các nơi lưu trú được phân loại là khách sạn để bạn xem sức chứa, tiện nghi và thông tin phòng đang công khai.",
    criteria: "Chỉ hiển thị nơi lưu trú được phân loại là khách sạn.",
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
