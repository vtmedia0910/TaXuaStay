import { Badge } from "@/components/ui/badge";
import { formatLodgingDate, formatVnd, PRICE_CONFIDENCE_LABELS, PRICE_SOURCE_LABELS, RATE_TYPE_LABELS } from "@/features/pricing/policy";
import type { PriceQuote } from "@/features/pricing/types";

export function PriceSummary({ quote, compact = false }: { quote?: PriceQuote | null; compact?: boolean }) {
  if (!quote) {
    return <p className="text-sm font-bold text-muted">Chọn ngày nhận và trả phòng để xem giá áp dụng.</p>;
  }
  if (quote.status !== "quoted" || quote.total_vnd === null) {
    return (
      <div className="rounded-2xl bg-copper/10 p-3 text-sm">
        <p className="font-bold text-copper-strong">Chưa thể xác định trọn vẹn giá cho kỳ nghỉ này.</p>
        <p className="mt-1 text-muted">Vui lòng liên hệ nơi lưu trú để xác nhận giá và tình trạng phòng.</p>
      </div>
    );
  }
  const resolvedLines = quote.nightly_lines.filter((line) => line.state === "resolved");
  const sources = [...new Set(resolvedLines.flatMap((line) => line.source ? [PRICE_SOURCE_LABELS[line.source]] : []))];
  const validUntilDates = resolvedLines.flatMap((line) => line.price_valid_until ? [line.price_valid_until] : []);
  const verifiedThrough = validUntilDates.length ? validUntilDates.sort()[0] : null;

  return (
    <div className="rounded-2xl bg-pine-soft p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge className="text-success">{PRICE_CONFIDENCE_LABELS[quote.confidence]}</Badge>
        <p className="font-display text-xl font-bold text-pine">{formatVnd(quote.total_vnd)}</p>
      </div>
      <p className="mt-2 text-sm text-muted">Tổng giá cơ bản cho {quote.nights} đêm · chưa xác nhận tình trạng phòng.</p>
      {quote.confidence === "verified" && verifiedThrough ? <p className="mt-1 text-xs font-bold text-success">Giá được xác minh đến {formatLodgingDate(verifiedThrough)}{sources.length ? ` · Nguồn: ${sources.join(", ")}` : ""}</p> : null}
      {quote.confidence !== "verified" && sources.length ? <p className="mt-1 text-xs text-muted">Nguồn ghi nhận: {sources.join(", ")}</p> : null}
      {!compact ? (
        <div className="mt-3 grid gap-2 border-t border-pine/10 pt-3 text-sm">
          {quote.nightly_lines.map((line) => (
            <div key={line.date} className="flex flex-wrap justify-between gap-2">
              <span>{formatLodgingDate(line.date)} · {line.rate_type ? RATE_TYPE_LABELS[line.rate_type] : "Chưa xác định"}</span>
              <strong>{line.base_price_vnd === null ? "Cần xác nhận" : formatVnd(line.base_price_vnd)}</strong>
            </div>
          ))}
          <p className="text-xs leading-5 text-muted">Phụ thu người lớn/trẻ em được lưu để tham khảo nhưng chưa tự động cộng vì chưa có mô hình sức chứa cơ bản an toàn.</p>
        </div>
      ) : null}
    </div>
  );
}
