import Link from "next/link";
import { SearchResultCard } from "@/components/search/search-result-card";
import { SearchPagination } from "@/components/search/search-pagination";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import type { RoomSearchParams, RoomSearchResponse } from "@/features/search/types";

function ResultGrid({ items, params }: { items: RoomSearchResponse["items"]; params: RoomSearchParams }) {
  return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map((result) => <SearchResultCard key={result.room.id} result={result} params={params} />)}</div>;
}

export function SearchResults({ response, params, landingSlug, preferCloudVerified = false }: {
  response: RoomSearchResponse;
  params: RoomSearchParams;
  landingSlug?: string;
  preferCloudVerified?: boolean;
}) {
  if (response.status === "unconfigured") {
    return (
      <EmptyState
        title="Danh sách phòng đang tạm thời chưa khả dụng"
        description="Bạn vẫn có thể xem trang và thử lại sau. Chúng tôi không hiển thị dữ liệu thay thế khi chưa kết nối được nguồn thông tin."
      />
    );
  }

  const verifiedItems = preferCloudVerified ? response.items.filter((item) => item.cloudView) : [];
  const describedItems = preferCloudVerified ? response.items.filter((item) => !item.cloudView) : [];

  if (response.status === "error") {
    return (
      <EmptyState
        title="Chưa thể tải danh sách phòng"
        description="Dữ liệu tạm thời không khả dụng. Hãy thử lại sau; hệ thống không suy đoán kết quả thay thế."
      />
    );
  }

  if (!response.items.length) {
    const outOfRange = response.total > 0 && params.page > response.totalPages;
    return (
      <EmptyState
        title={outOfRange ? "Trang kết quả không tồn tại" : "Chưa tìm thấy phòng phù hợp với các bộ lọc này"}
        description={outOfRange
          ? "Hãy trở về trang kết quả đầu tiên."
          : "Thử xóa bớt bộ lọc, giảm yêu cầu khách hoặc xem tất cả khu vực. Đây không có nghĩa là các phòng đã bán hết."}
        action={
          <Link href={landingSlug ? `/${landingSlug}` : "/stay"} className={buttonVariants({ variant: "secondary" })}>
            {landingSlug ? "Về trang đầu" : "Xóa bộ lọc"}
          </Link>
        }
      />
    );
  }

  return (
    <section aria-labelledby="search-results-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-copper-strong">Phòng phù hợp nhu cầu</p>
          <h2 id="search-results-title" className="mt-1 font-display text-3xl font-bold text-pine">
            {response.total} loại phòng có thông tin phù hợp
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-muted">
          Giá và tình trạng phòng được tính riêng cho ngày đã chọn. Tình trạng có thể thay đổi tới khi yêu cầu đặt phòng được xác nhận.
        </p>
      </div>

      {preferCloudVerified ? (
        <div className="grid gap-10">
          {verifiedItems.length ? <section aria-labelledby="verified-results-title"><h3 id="verified-results-title" className="mb-4 font-display text-2xl font-bold text-pine">Phòng có Cloud View đã thẩm định còn hiệu lực</h3><ResultGrid items={verifiedItems} params={params} /></section> : null}
          {describedItems.length ? <section aria-labelledby="described-results-title"><h3 id="described-results-title" className="font-display text-2xl font-bold text-pine">Phòng có thông tin hướng nhìn, chưa được xác minh</h3><p className="mb-4 mt-2 text-sm leading-6 text-muted">Những phòng này khớp mô tả hướng nhìn cơ bản nhưng chưa có nhãn hoặc điểm Cloud View đã thẩm định.</p><ResultGrid items={describedItems} params={params} /></section> : null}
        </div>
      ) : <ResultGrid items={response.items} params={params} />}
      <SearchPagination params={params} totalPages={response.totalPages} landingSlug={landingSlug} />
    </section>
  );
}
