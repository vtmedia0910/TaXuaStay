import Link from "next/link";
import { AlertTriangle, Pencil, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { PriceSummary } from "@/components/pricing/price-summary";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { detectAdminPricingIssues } from "@/features/pricing/diagnostics";
import { getAdminPreviewRules, getAdminRatePlans, getAdminRateRules } from "@/features/pricing/data";
import { formatVnd, RATE_TYPE_LABELS } from "@/features/pricing/policy";
import { resolveRoomPrice } from "@/features/pricing/resolver";
import { pricingPreviewSchema } from "@/features/pricing/schema";
import { RATE_TYPES } from "@/features/pricing/types";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRooms } from "@/features/rooms/data";

type RateSearchParams = {
  saved?: string;
  error?: string;
  room_type_id?: string;
  check_in?: string;
  check_out?: string;
  adults?: string;
  children?: string;
  property?: string;
  room?: string;
  plan?: string;
  rate_type?: string;
};

export default async function AdminRatesPage({ searchParams }: { searchParams: Promise<RateSearchParams> }) {
  const params = await searchParams;
  const properties = await getAdminPropertyOptions();
  const [plans, rules, rooms] = await Promise.all([
    getAdminRatePlans(),
    getAdminRateRules(),
    getAdminRooms(properties),
  ]);
  const propertyNames = new Map(properties.map((property) => [property.id, property.name]));
  const planMap = new Map(plans.map((plan) => [plan.id, plan]));
  const roomMap = new Map(rooms.map((room) => [room.id, room]));
  const filteredPlans = params.property ? plans.filter((plan) => plan.property_id === params.property) : plans;
  const filteredRules = rules.filter((rule) => {
    const plan = planMap.get(rule.rate_plan_id);
    return (!params.property || plan?.property_id === params.property)
      && (!params.room || rule.room_type_id === params.room)
      && (!params.plan || rule.rate_plan_id === params.plan)
      && (!params.rate_type || rule.rate_type === params.rate_type);
  });
  const issues = detectAdminPricingIssues({
    plans,
    rules,
    activeRoomIds: rooms.filter((room) => room.is_active).map((room) => room.id),
  });
  const previewInput = pricingPreviewSchema.safeParse({
    room_type_id: params.room_type_id,
    check_in: params.check_in,
    check_out: params.check_out,
    adults: params.adults ?? "2",
    children: params.children ?? "0",
  });
  const previewRules = previewInput.success ? await getAdminPreviewRules(previewInput.data.room_type_id) : [];
  const preview = previewInput.success ? resolveRoomPrice({
    roomTypeId: previewInput.data.room_type_id,
    checkIn: previewInput.data.check_in,
    checkOut: previewInput.data.check_out,
    rules: previewRules,
  }) : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AdminPageHeader title="Bảng giá và quy tắc" description="Tính giá theo từng đêm; không suy ra tình trạng phòng và không tự cộng phụ thu khi chưa đủ ngữ cảnh sức chứa." action={<div className="flex flex-wrap gap-2"><Link href="/admin/rates/plans/new" className={buttonVariants()}><Plus size={18} />Bảng giá</Link><Link href="/admin/rates/rules/new" className={buttonVariants({ variant: "secondary" })}><Plus size={18} />Quy tắc</Link></div>} />
      <FormFeedback saved={params.saved} error={params.error} />

      <form method="get" className="mb-8 grid gap-3 rounded-3xl border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-5">
        <label className="grid gap-2 text-sm font-bold">Nơi lưu trú<Select name="property" defaultValue={params.property ?? ""}><option value="">Tất cả</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</Select></label>
        <label className="grid gap-2 text-sm font-bold">Phòng<Select name="room" defaultValue={params.room ?? ""}><option value="">Tất cả</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</Select></label>
        <label className="grid gap-2 text-sm font-bold">Bảng giá<Select name="plan" defaultValue={params.plan ?? ""}><option value="">Tất cả</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</Select></label>
        <label className="grid gap-2 text-sm font-bold">Loại giá<Select name="rate_type" defaultValue={params.rate_type ?? ""}><option value="">Tất cả</option>{RATE_TYPES.map((type) => <option key={type} value={type}>{RATE_TYPE_LABELS[type]}</option>)}</Select></label>
        <button className={`${buttonVariants({ variant: "secondary" })} self-end`}>Lọc dữ liệu</button>
      </form>

      <section className="mb-8" aria-labelledby="pricing-warnings-title">
        <h2 id="pricing-warnings-title" className="font-display text-2xl font-bold text-pine">Cảnh báo dữ liệu</h2>
        <div className="mt-4 grid gap-3">
          {issues.map((issue, index) => <div key={`${issue.code}-${index}`} className={issue.severity === "error" ? "rounded-2xl bg-red-50 p-4 text-sm text-danger" : "rounded-2xl bg-copper/10 p-4 text-sm text-copper-strong"}><p className="flex gap-2 font-bold"><AlertTriangle size={18} className="shrink-0" />{issue.message}</p></div>)}
          {!issues.length ? <p className="rounded-2xl bg-pine-soft p-4 text-sm font-bold text-success">✓ Chưa phát hiện khoảng trống, dữ liệu cũ hoặc xung đột ưu tiên.</p> : null}
        </div>
      </section>

      <section className="mb-8" aria-labelledby="price-preview-title">
        <h2 id="price-preview-title" className="font-display text-2xl font-bold text-pine">Xem trước lịch giá</h2>
        <Card className="mt-4 p-5">
          <form method="get" className="grid gap-4 md:grid-cols-5">
            <label className="grid gap-2 text-sm font-bold md:col-span-2">Loại phòng<Select name="room_type_id" defaultValue={params.room_type_id ?? ""} required><option value="" disabled>Chọn phòng</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.property_name}</option>)}</Select></label>
            <label className="grid gap-2 text-sm font-bold">Nhận phòng<Input type="date" name="check_in" defaultValue={params.check_in} required /></label>
            <label className="grid gap-2 text-sm font-bold">Trả phòng<Input type="date" name="check_out" defaultValue={params.check_out} required /></label>
            <button className={buttonVariants()}>Tính giá</button>
            <input type="hidden" name="adults" value={params.adults ?? "2"} /><input type="hidden" name="children" value={params.children ?? "0"} />
          </form>
          <p className="mt-3 text-xs text-muted">Số khách được giữ trong preview nhưng phụ thu chưa áp dụng tự động. Preview gồm cả draft đang hoạt động để staff kiểm tra trước khi xuất bản.</p>
          {preview ? <div className="mt-5"><PriceSummary quote={preview} /><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[48rem] text-left text-sm"><thead><tr className="border-b border-line"><th className="p-2">Đêm</th><th className="p-2">Trạng thái</th><th className="p-2">Rule</th><th className="p-2">Plan</th><th className="p-2">Confidence</th></tr></thead><tbody>{preview.nightly_lines.map((line) => <tr key={line.date} className="border-b border-line/60"><td className="p-2">{line.date}</td><td className="p-2">{line.state}</td><td className="p-2 font-mono text-xs">{line.rule_id ?? (line.conflicting_rule_ids.join(", ") || "—")}</td><td className="p-2 font-mono text-xs">{line.rate_plan_id ?? "—"}</td><td className="p-2">{line.confidence}</td></tr>)}</tbody></table></div>{preview.has_conflict ? <p className="mt-3 text-sm font-bold text-danger">Xung đột nội bộ: {preview.nightly_lines.flatMap((line) => line.conflicting_rule_ids).join(", ")}</p> : null}</div> : params.room_type_id ? <p className="mt-4 text-sm font-bold text-danger">Ngày hoặc phòng xem trước chưa hợp lệ.</p> : null}
        </Card>
      </section>

      <section className="mb-8" aria-labelledby="rate-plans-title">
        <h2 id="rate-plans-title" className="font-display text-2xl font-bold text-pine">Bảng giá</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filteredPlans.map((plan) => <Card key={plan.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><Badge>{propertyNames.get(plan.property_id) ?? "Không xác định"}</Badge><Badge className={plan.publish_status === "published" ? "text-success" : "bg-copper/10 text-copper-strong"}>{plan.publish_status}</Badge></div><h3 className="mt-3 font-display text-xl font-bold text-pine">{plan.name}</h3><p className="mt-1 text-sm text-muted">{plan.code} · ưu tiên {plan.priority} · {plan.is_active ? "active" : "inactive"}</p><p className="mt-1 text-sm text-muted">{plan.valid_from ?? "không giới hạn"} → {plan.valid_until ?? "không giới hạn"}</p></div><Link href={`/admin/rates/plans/${plan.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Pencil size={16} />Sửa</Link></div></Card>)}
          {!filteredPlans.length ? <Card className="p-5 text-sm text-muted">Chưa có bảng giá phù hợp bộ lọc. Hệ thống không tạo giá mẫu.</Card> : null}
        </div>
      </section>

      <section aria-labelledby="rate-rules-title">
        <h2 id="rate-rules-title" className="font-display text-2xl font-bold text-pine">Quy tắc giá phòng</h2>
        <div className="mt-4 grid gap-3">
          {filteredRules.map((rule) => { const room = roomMap.get(rule.room_type_id); const plan = planMap.get(rule.rate_plan_id); return <Card key={rule.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><Badge>{RATE_TYPE_LABELS[rule.rate_type]}</Badge><Badge>{rule.source}</Badge>{!rule.is_active ? <Badge className="bg-red-50 text-danger">inactive</Badge> : null}</div><h3 className="mt-3 font-display text-xl font-bold text-pine">{room?.name ?? "Phòng không xác định"} · {formatVnd(rule.price_vnd)}</h3><p className="mt-1 text-sm text-muted">{plan?.name ?? "Bảng giá không xác định"} · ưu tiên rule {rule.priority} / plan {plan?.priority ?? "?"}</p><p className="mt-1 text-sm text-muted">{rule.valid_from ?? "không giới hạn"} → {rule.valid_until ?? "không giới hạn"} · xác minh đến {rule.price_valid_until ?? "chưa có"}</p></div><Link href={`/admin/rates/rules/${rule.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Pencil size={16} />Sửa</Link></div></Card>; })}
          {!filteredRules.length ? <Card className="p-5 text-sm text-muted">Chưa có quy tắc giá phù hợp bộ lọc. Trang công khai sẽ yêu cầu chọn ngày và không suy đoán giá.</Card> : null}
        </div>
      </section>
    </main>
  );
}
