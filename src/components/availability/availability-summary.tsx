import { Badge } from "@/components/ui/badge";
import { AVAILABILITY_STATE_LABELS, formatAvailabilitySummary, INVENTORY_SOURCE_LABELS } from "@/features/availability/policy";
import type { AvailabilityQuote } from "@/features/availability/types";

const STATE_CLASS = {
  live: "bg-pine-soft text-success",
  verified_today: "bg-pine-soft text-success",
  needs_confirmation: "bg-copper/10 text-copper-strong",
  unknown: "bg-mist text-muted",
  sold_out: "bg-red-50 text-danger",
} as const;

export function AvailabilitySummary({ quote, detailed = false }: {
  quote?: AvailabilityQuote | null;
  detailed?: boolean;
}) {
  if (!quote) {
    return <p className="rounded-2xl bg-mist p-3 text-sm font-bold text-muted">Chọn ngày để xem tình trạng phòng.</p>;
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={STATE_CLASS[quote.state]}>{formatAvailabilitySummary(quote)}</Badge>
        <span className="text-xs text-muted">cho {quote.requested_rooms} phòng · {quote.nights} đêm</span>
      </div>
      {detailed && quote.freshest_verified_at ? (
        <p className="text-xs text-muted">
          Bản ghi mới nhất: {new Date(quote.freshest_verified_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
        </p>
      ) : null}
      {detailed ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead><tr className="border-b border-line"><th className="p-2">Đêm</th><th className="p-2">Tình trạng</th><th className="p-2">Số lượng ghi nhận</th><th className="p-2">Nguồn</th></tr></thead>
            <tbody>{quote.nightly_lines.map((line) => (
              <tr key={line.date} className="border-b border-line/60">
                <td className="p-2 font-bold">{line.date}</td>
                <td className="p-2">{AVAILABILITY_STATE_LABELS[line.state]}</td>
                <td className="p-2">{line.available_quantity ?? "Chưa có dữ liệu"}</td>
                <td className="p-2">{line.source ? INVENTORY_SOURCE_LABELS[line.source] : "Chưa xác định"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
