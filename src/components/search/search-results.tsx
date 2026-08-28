import Link from "next/link";
import { SearchResultCard } from "@/components/search/search-result-card";
import { SearchPagination } from "@/components/search/search-pagination";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import type { RoomSearchParams, RoomSearchResponse } from "@/features/search/types";

export function SearchResults({ response, params, landingSlug }: {
  response: RoomSearchResponse;
  params: RoomSearchParams;
  landingSlug?: string;
}) {
  if (response.status === "unconfigured") {
    return (
      <EmptyState
        title="Chưa kết nối dữ liệu Stay"
        description="Trang vẫn hoạt động an toàn, nhưng cần cấu hình public Supabase URL và anon key của đúng project Stay để tải room type."
      />
    );
  }

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
          <Link href={landingSlug ? `/${landingSlug}` : "/tim-phong"} className={buttonVariants({ variant: "secondary" })}>
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
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-copper-strong">Room-first discovery</p>
          <h2 id="search-results-title" className="mt-1 font-display text-3xl font-bold text-pine">
            {response.total} loại phòng phù hợp dữ liệu hiện có
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-muted">
          Không hiển thị giá, rating hay tình trạng còn phòng vì các dữ liệu đó chưa tồn tại trong Phase 3.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {response.items.map((result) => <SearchResultCard key={result.room.id} result={result} />)}
      </div>
      <SearchPagination params={params} totalPages={response.totalPages} landingSlug={landingSlug} />
    </section>
  );
}
