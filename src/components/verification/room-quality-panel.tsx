import { Card } from "@/components/ui/card";
import {
  formatRoomQualityScore,
  getRoomQualityLabel,
  ROOM_QUALITY_LABELS,
} from "@/features/room-profiles/policy";
import {
  ROOM_QUALITY_DIMENSIONS,
  type PublicRoomQualityAssessmentDto,
} from "@/features/room-profiles/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export function RoomQualityPanel({
  assessment,
  scopeLabel,
  compact = false,
}: {
  assessment: PublicRoomQualityAssessmentDto | null;
  scopeLabel: string;
  compact?: boolean;
}) {
  return (
    <Card className={compact ? "bg-white p-4 text-ink" : "bg-white p-5 text-ink"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-copper-strong">Chất lượng phòng</p>
          <h3 className="mt-1 font-display text-xl font-bold text-pine">{scopeLabel}</h3>
        </div>
        {assessment ? <p className="text-xs text-muted">Xác minh {formatDate(assessment.verified_at)}</p> : null}
      </div>
      <dl className={`mt-4 grid gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
        {ROOM_QUALITY_DIMENSIONS.map((dimension) => {
          const score = assessment?.[`${dimension}_score`] ?? null;
          const state = assessment?.[`${dimension}_state`] ?? "unknown";
          const current = state === "current" && score !== null;
          return (
            <div key={dimension} className="rounded-2xl bg-mist p-3">
              <dt className="text-sm font-bold text-pine">{ROOM_QUALITY_LABELS[dimension]}</dt>
              <dd className="mt-1 text-sm text-muted">
                {current ? <><strong className="text-ink">{formatRoomQualityScore(score)}</strong> · {getRoomQualityLabel(score)}</> : state === "stale" ? "Cần kiểm tra lại" : "Chưa xác minh"}
              </dd>
            </div>
          );
        })}
      </dl>
      {assessment?.notes_public ? <p className="mt-4 text-sm leading-6 text-muted">{assessment.notes_public}</p> : null}
      <p className="mt-4 text-xs leading-5 text-muted">Các chiều được đánh giá riêng; không có điểm tổng và không dùng thay Cloud View.</p>
    </Card>
  );
}
