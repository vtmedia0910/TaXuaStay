import Link from "next/link";
import { AlertTriangle, Pencil, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  getAdminCommercialPlans,
  getAdminCommercialPreviewRules,
  getAdminCommercialRules,
  getAdminEconomicsSupplierOptions,
} from "@/features/economics/data";
import { COMMERCIAL_FRESHNESS_LABELS, COMMERCIAL_STATUS_LABELS } from "@/features/economics/policy";
import { resolveRoomEconomics } from "@/features/economics/resolver";
import { economicsPreviewSchema } from "@/features/economics/schema";
import { COMMERCIAL_PLAN_STATUSES } from "@/features/economics/types";
import { dateIntervalsOverlap } from "@/features/pricing/intervals";
import { formatVnd, RATE_TYPE_LABELS } from "@/features/pricing/policy";
import { resolveRoomPrice } from "@/features/pricing/resolver";
import { getAdminPreviewRules } from "@/features/pricing/data";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRoomOptions } from "@/features/rooms/data";

type EconomicsSearchParams = {
  saved?: string;
  error?: string;
  property?: string;
  room?: string;
  supplier?: string;
  status?: string;
  issue?: string;
  room_type_id?: string;
  check_in?: string;
  check_out?: string;
};

const WARNING_LABELS: Record<string, string> = {
  "sell-missing": "Có giá vốn nhưng thiếu giá bán",
  "cost-missing": "Giá bán có nhưng thiếu giá vốn",
  "market-missing": "Chưa có tham chiếu thị trường",
  "commercial-conflict": "Quy tắc thương mại xung đột",
  "sell-conflict": "Quy tắc giá bán xung đột",
  "negative-contribution": "Giá vốn vượt giá bán",
  "commercial-expired": "Quy tắc thương mại đã hết hạn xác minh",
  "commercial-stale": "Xác minh thương mại cần cập nhật",
  "market-stale": "Tham chiếu thị trường đã cũ",
  "supplier-relationship-inactive": "Quan hệ nhà cung cấp và cơ sở không còn hiệu lực",
};

export default async function AdminEconomicsPage({ searchParams }: { searchParams: Promise<EconomicsSearchParams> }) {
  const params = await searchParams;
  const [properties, rooms, suppliers, plans, rules] = await Promise.all([
    getAdminPropertyOptions(),
    getAdminRoomOptions(),
    getAdminEconomicsSupplierOptions(),
    getAdminCommercialPlans(),
    getAdminCommercialRules(),
  ]);
  const planMap = new Map(plans.map((plan) => [plan.id, plan]));
  const propertyNames = new Map(properties.map((property) => [property.id, property.name]));
  const supplierNames = new Map(suppliers.map((supplier) => [supplier.id, supplier.display_name]));
  const roomMap = new Map(rooms.map((room) => [room.id, room]));
  const today = new Date().toISOString().slice(0, 10);

  const previewInput = economicsPreviewSchema.safeParse({
    room_type_id: params.room_type_id,
    check_in: params.check_in,
    check_out: params.check_out,
  });
  const [sellRules, commercialRules] = previewInput.success
    ? await Promise.all([
      getAdminPreviewRules(previewInput.data.room_type_id),
      getAdminCommercialPreviewRules(previewInput.data.room_type_id),
    ])
    : [[], []];
  const sellQuote = previewInput.success ? resolveRoomPrice({
    roomTypeId: previewInput.data.room_type_id,
    checkIn: previewInput.data.check_in,
    checkOut: previewInput.data.check_out,
    rules: sellRules,
  }) : null;
  const quote = previewInput.success && sellQuote ? resolveRoomEconomics({
    roomTypeId: previewInput.data.room_type_id,
    checkIn: previewInput.data.check_in,
    checkOut: previewInput.data.check_out,
    sellQuote,
    commercialRules,
    eligiblePlanStatuses: ["active", "draft"],
  }) : null;
  const negativeRuleIds = new Set(quote?.nightly_lines.filter((line) => line.gross_contribution_vnd !== null && line.gross_contribution_vnd < 0).map((line) => line.commercial_rule_id) ?? []);

  function isStaticConflict(ruleId: string) {
    const rule = rules.find((candidate) => candidate.id === ruleId);
    const plan = rule ? planMap.get(rule.commercial_rate_plan_id) : null;
    if (!rule || !plan || !rule.is_active) return false;
    return rules.some((candidate) => {
      const candidatePlan = planMap.get(candidate.commercial_rate_plan_id);
      return candidate.id !== rule.id && candidate.is_active
        && candidate.room_type_id === rule.room_type_id
        && candidate.rate_type === rule.rate_type
        && candidate.priority === rule.priority
        && candidatePlan?.priority === plan.priority
        && dateIntervalsOverlap(
          { valid_from: candidate.effective_from, valid_until: candidate.effective_until },
          { valid_from: rule.effective_from, valid_until: rule.effective_until },
        );
    });
  }

  const filteredPlans = plans.filter((plan) =>
    (!params.property || plan.property_id === params.property)
    && (!params.supplier || plan.supplier_id === params.supplier)
    && (!params.status || plan.status === params.status),
  );
  const filteredRules = rules.filter((rule) => {
    const plan = planMap.get(rule.commercial_rate_plan_id);
    if (params.property && rule.property_id !== params.property) return false;
    if (params.room && rule.room_type_id !== params.room) return false;
    if (params.supplier && rule.supplier_id !== params.supplier) return false;
    if (params.status && plan?.status !== params.status) return false;
    if (params.issue === "missing-cost" && rule.net_cost_vnd !== null) return false;
    if (params.issue === "stale" && (!rule.valid_until || rule.valid_until >= today)) return false;
    if (params.issue === "conflict" && !isStaticConflict(rule.id)) return false;
    if (params.issue === "negative" && !negativeRuleIds.has(rule.id)) return false;
    return true;
  });
  const activePlansWithoutRules = plans.filter((plan) => plan.status === "active" && !rules.some((rule) => rule.commercial_rate_plan_id === plan.id && rule.is_active));
  const previewWarnings = [...new Set(quote?.nightly_lines.flatMap((line) => line.warnings) ?? [])];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AdminPageHeader title="Chi phí & biên" description="So sánh giá bán hiện hành với giá vốn và tham chiếu thị trường riêng tư. Đây là đóng góp gộp, không phải lợi nhuận ròng." action={<div className="flex flex-wrap gap-2"><Link href="/admin/economics/plans/new" className={buttonVariants()}><Plus size={18} />Bảng chi phí</Link><Link href="/admin/economics/rules/new" className={buttonVariants({ variant: "secondary" })}><Plus size={18} />Quy tắc</Link></div>} />
      <FormFeedback saved={params.saved} error={params.error} />

      <form method="get" className="mb-8 grid gap-3 rounded-3xl border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-6">
        <label className="grid gap-2 text-sm font-bold">Nơi lưu trú<Select name="property" defaultValue={params.property ?? ""}><option value="">Tất cả</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</Select></label>
        <label className="grid gap-2 text-sm font-bold">Loại phòng<Select name="room" defaultValue={params.room ?? ""}><option value="">Tất cả</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</Select></label>
        <label className="grid gap-2 text-sm font-bold">Nhà cung cấp<Select name="supplier" defaultValue={params.supplier ?? ""}><option value="">Tất cả</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.display_name}</option>)}</Select></label>
        <label className="grid gap-2 text-sm font-bold">Trạng thái<Select name="status" defaultValue={params.status ?? ""}><option value="">Tất cả</option>{COMMERCIAL_PLAN_STATUSES.map((status) => <option key={status} value={status}>{COMMERCIAL_STATUS_LABELS[status]}</option>)}</Select></label>
        <label className="grid gap-2 text-sm font-bold">Cảnh báo<Select name="issue" defaultValue={params.issue ?? ""}><option value="">Tất cả</option><option value="missing-cost">Thiếu giá vốn</option><option value="stale">Dữ liệu cũ</option><option value="conflict">Xung đột</option><option value="negative">Biên âm trong preview</option></Select></label>
        <button className={`${buttonVariants({ variant: "secondary" })} self-end`}>Lọc dữ liệu</button>
      </form>

      <section className="mb-8" aria-labelledby="economics-warnings-title">
        <h2 id="economics-warnings-title" className="font-display text-2xl font-bold text-pine">Cảnh báo vận hành</h2>
        <div className="mt-4 grid gap-3">
          {activePlansWithoutRules.map((plan) => <p key={plan.id} className="flex gap-2 rounded-2xl bg-copper/10 p-4 text-sm font-bold text-copper-strong"><AlertTriangle size={18} />Bảng “{plan.name}” đang áp dụng nhưng chưa có quy tắc hoạt động.</p>)}
          {previewWarnings.map((warning) => <p key={warning} className={warning.includes("conflict") || warning === "negative-contribution" ? "flex gap-2 rounded-2xl bg-red-50 p-4 text-sm font-bold text-danger" : "flex gap-2 rounded-2xl bg-copper/10 p-4 text-sm font-bold text-copper-strong"}><AlertTriangle size={18} />{WARNING_LABELS[warning]}</p>)}
          {!activePlansWithoutRules.length && !previewWarnings.length ? <p className="rounded-2xl bg-pine-soft p-4 text-sm font-bold text-success">✓ Chưa phát hiện cảnh báo trong dữ liệu hoặc khoảng ngày đang xem.</p> : null}
        </div>
      </section>

      <section className="mb-8" aria-labelledby="economics-preview-title">
        <h2 id="economics-preview-title" className="font-display text-2xl font-bold text-pine">Xem trước giá bán, giá vốn và biên</h2>
        <Card className="mt-4 p-5">
          <form method="get" className="grid gap-4 md:grid-cols-4">
            <label className="grid gap-2 text-sm font-bold md:col-span-2">Loại phòng<Select name="room_type_id" defaultValue={params.room_type_id ?? ""} required><option value="" disabled>Chọn phòng</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {propertyNames.get(room.property_id) ?? "Không xác định"}</option>)}</Select></label>
            <label className="grid gap-2 text-sm font-bold">Nhận phòng<Input type="date" name="check_in" defaultValue={params.check_in} required /></label>
            <label className="grid gap-2 text-sm font-bold">Trả phòng<Input type="date" name="check_out" defaultValue={params.check_out} required /></label>
            <button className={`${buttonVariants()} md:col-start-4`}>Tính economics</button>
          </form>
          <p className="mt-3 text-xs text-muted">Preview gồm bảng active và bản nháp để kiểm tra nội bộ. Trang công khai và giá bán không bị thay đổi.</p>
          {quote ? <div className="mt-5 grid gap-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Giá bán", quote.sell_subtotal_vnd],
                ["Giá vốn", quote.net_cost_total_vnd],
                ["Tham chiếu thị trường", quote.market_reference_total_vnd],
                ["Đóng góp gộp", quote.gross_contribution_vnd],
              ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-mist p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p><p className="mt-2 font-display text-lg font-bold text-pine">{typeof value === "number" ? formatVnd(value) : "Chưa có dữ liệu"}</p></div>)}
              <div className="rounded-2xl bg-mist p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">Biên gộp</p><p className="mt-2 font-display text-lg font-bold text-pine">{quote.gross_margin_bps === null ? "Chưa có dữ liệu" : `${(quote.gross_margin_bps / 100).toLocaleString("vi-VN")}%`}</p></div>
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[66rem] text-left text-sm"><thead><tr className="border-b border-line"><th className="p-2">Đêm</th><th className="p-2">Giá bán</th><th className="p-2">Giá vốn</th><th className="p-2">Tham chiếu</th><th className="p-2">Đóng góp</th><th className="p-2">Rule chi phí</th><th className="p-2">Rule bán</th><th className="p-2">Độ mới</th><th className="p-2">Cảnh báo</th></tr></thead><tbody>{quote.nightly_lines.map((line) => <tr key={line.date} className="border-b border-line/60 align-top"><td className="p-2">{line.date}</td><td className="p-2">{line.sell_price_vnd === null ? "Chưa có" : formatVnd(line.sell_price_vnd)}</td><td className="p-2">{line.net_cost_vnd === null ? "Chưa có" : formatVnd(line.net_cost_vnd)}</td><td className="p-2">{line.market_reference_vnd === null ? "Chưa có" : formatVnd(line.market_reference_vnd)}</td><td className="p-2">{line.gross_contribution_vnd === null ? "Chưa có" : formatVnd(line.gross_contribution_vnd)}</td><td className="p-2 font-mono text-xs">{line.commercial_rule_id ?? (line.conflicting_commercial_rule_ids.join(", ") || "—")}</td><td className="p-2 font-mono text-xs">{line.sell_rule_id ?? "—"}</td><td className="p-2">{COMMERCIAL_FRESHNESS_LABELS[line.commercial_freshness]}</td><td className="p-2 text-xs">{line.warnings.map((warning) => WARNING_LABELS[warning]).join("; ") || "—"}</td></tr>)}</tbody></table></div>
          </div> : params.room_type_id ? <p className="mt-4 text-sm font-bold text-danger">Khoảng ngày hoặc loại phòng chưa hợp lệ.</p> : null}
        </Card>
      </section>

      <section className="mb-8" aria-labelledby="commercial-plans-title">
        <h2 id="commercial-plans-title" className="font-display text-2xl font-bold text-pine">Bảng chi phí</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filteredPlans.map((plan) => <Card key={plan.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><Badge>{supplierNames.get(plan.supplier_id) ?? "Không xác định"}</Badge><Badge>{COMMERCIAL_STATUS_LABELS[plan.status]}</Badge></div><h3 className="mt-3 font-display text-xl font-bold text-pine">{plan.name}</h3><p className="mt-1 text-sm text-muted">{propertyNames.get(plan.property_id) ?? "Không xác định"} · {plan.code} · ưu tiên {plan.priority}</p><p className="mt-1 text-sm text-muted">{plan.valid_from ?? "không giới hạn"} → {plan.valid_until ?? "không giới hạn"}</p></div><Link href={`/admin/economics/plans/${plan.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Pencil size={16} />Sửa</Link></div></Card>)}
          {!filteredPlans.length ? <Card className="p-5 text-sm text-muted">Chưa có bảng chi phí phù hợp. Hệ thống không tạo dữ liệu thương mại mẫu.</Card> : null}
        </div>
      </section>

      <section aria-labelledby="commercial-rules-title">
        <h2 id="commercial-rules-title" className="font-display text-2xl font-bold text-pine">Quy tắc chi phí phòng</h2>
        <div className="mt-4 grid gap-3">
          {filteredRules.map((rule) => { const plan = planMap.get(rule.commercial_rate_plan_id); const room = roomMap.get(rule.room_type_id); return <Card key={rule.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><Badge>{RATE_TYPE_LABELS[rule.rate_type]}</Badge><Badge>{plan ? COMMERCIAL_STATUS_LABELS[plan.status] : "Không xác định"}</Badge>{!rule.is_active ? <Badge className="bg-red-50 text-danger">Ngừng hoạt động</Badge> : null}</div><h3 className="mt-3 font-display text-xl font-bold text-pine">{room?.name ?? "Phòng không xác định"}</h3><p className="mt-1 text-sm text-muted">Giá vốn: {rule.net_cost_vnd === null ? "Chưa có dữ liệu" : formatVnd(rule.net_cost_vnd)} · Tham chiếu: {rule.market_reference_vnd === null ? "Chưa có dữ liệu" : formatVnd(rule.market_reference_vnd)}</p><p className="mt-1 text-sm text-muted">{plan?.name ?? "Bảng không xác định"} · {rule.effective_from ?? "không giới hạn"} → {rule.effective_until ?? "không giới hạn"} · xác minh đến {rule.valid_until ?? "chưa có"}</p></div><Link href={`/admin/economics/rules/${rule.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Pencil size={16} />Sửa</Link></div></Card>; })}
          {!filteredRules.length ? <Card className="p-5 text-sm text-muted">Chưa có quy tắc chi phí phù hợp. Dữ liệu thiếu vẫn là chưa có, không được đổi thành 0.</Card> : null}
        </div>
      </section>
    </main>
  );
}
