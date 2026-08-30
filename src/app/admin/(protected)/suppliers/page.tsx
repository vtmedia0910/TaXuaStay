import Link from "next/link";
import { AlertTriangle, Pencil, Plus, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getAdminSuppliers } from "@/features/suppliers/data";
import {
  CONTACT_TYPE_LABELS,
  PARTNER_STATUS_LABELS,
  PARTNER_TIER_POLICY,
  SUPPLIER_STATUS_LABELS,
  SUPPLIER_TYPE_LABELS,
} from "@/features/suppliers/policy";
import { supplierQuerySchema } from "@/features/suppliers/schema";
import { PARTNER_STATUSES, SUPPLIER_STATUSES, SUPPLIER_TYPES } from "@/features/suppliers/types";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters = supplierQuerySchema.parse({
    query: first(raw.query) ?? "",
    type: first(raw.type) ?? "all",
    status: first(raw.status) ?? "all",
    partner: first(raw.partner) ?? "all",
  });
  const suppliers = await getAdminSuppliers(filters);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="Nhà cung cấp & đối tác"
        description="Danh tính và quan hệ vận hành riêng tư. Tier đối tác không phải điểm chất lượng hoặc xác minh."
        action={<Link href="/admin/suppliers/new" className={buttonVariants()}><Plus size={18} aria-hidden="true" />Thêm nhà cung cấp</Link>}
      />
      <FormFeedback saved={first(raw.saved)} error={first(raw.error)} />
      <form method="get" className="mb-5 grid gap-3 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="relative sm:col-span-2 lg:col-span-2"><span className="sr-only">Tìm nhà cung cấp</span><Search className="pointer-events-none absolute left-3 top-3.5 text-muted" size={18} aria-hidden="true" /><Input name="query" defaultValue={filters.query} className="pl-10" placeholder="Mã hoặc tên nhà cung cấp" /></label>
        <Select name="type" aria-label="Loại nhà cung cấp" defaultValue={filters.type}><option value="all">Tất cả loại</option>{SUPPLIER_TYPES.map((value) => <option key={value} value={value}>{SUPPLIER_TYPE_LABELS[value]}</option>)}</Select>
        <Select name="status" aria-label="Trạng thái nhà cung cấp" defaultValue={filters.status}><option value="all">Tất cả trạng thái</option>{SUPPLIER_STATUSES.map((value) => <option key={value} value={value}>{SUPPLIER_STATUS_LABELS[value]}</option>)}</Select>
        <div className="flex gap-2"><Select name="partner" aria-label="Trạng thái đối tác" defaultValue={filters.partner}><option value="all">Mọi quan hệ</option><option value="none">Chưa có quan hệ</option>{PARTNER_STATUSES.map((value) => <option key={value} value={value}>{PARTNER_STATUS_LABELS[value]}</option>)}</Select><button className={buttonVariants({ size: "sm" })}>Lọc</button></div>
      </form>

      <div className="grid gap-4">
        {suppliers.map((supplier) => (
          <Card key={supplier.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2"><Badge>{SUPPLIER_TYPE_LABELS[supplier.supplier_type]}</Badge><Badge className={supplier.status === "active" ? "text-success" : "bg-stone-100 text-muted"}>{SUPPLIER_STATUS_LABELS[supplier.status]}</Badge>{supplier.partner_status ? <Badge>{PARTNER_STATUS_LABELS[supplier.partner_status]}</Badge> : null}</div>
                <h2 className="mt-3 break-words font-display text-2xl font-bold text-pine">{supplier.display_name}</h2>
                <p className="mt-1 font-mono text-xs font-bold text-muted">{supplier.supplier_code}</p>
              </div>
              <Link href={`/admin/suppliers/${supplier.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Pencil size={16} aria-hidden="true" />Chi tiết</Link>
            </div>
            <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-muted">Liên hệ chính</dt><dd className="mt-1 font-bold text-pine">{supplier.primary_contact ? `${supplier.primary_contact.contact_name} · ${CONTACT_TYPE_LABELS[supplier.primary_contact.contact_type]}` : "Chưa có"}</dd></div>
              <div><dt className="text-muted">Cơ sở đang liên kết</dt><dd className="mt-1 font-bold text-pine">{supplier.linked_property_count}</dd></div>
              <div><dt className="text-muted">Tier nội bộ</dt><dd className="mt-1 font-bold text-pine">{supplier.partner_tier ? PARTNER_TIER_POLICY[supplier.partner_tier].label : "Chưa có"}</dd></div>
              <div><dt className="text-muted">Cập nhật</dt><dd className="mt-1 font-bold text-pine">{new Intl.DateTimeFormat("vi-VN").format(new Date(supplier.updated_at))}</dd></div>
            </dl>
            {supplier.warnings.length ? <div className="mt-4 flex flex-wrap gap-2">{supplier.warnings.map((warning) => <Badge key={warning} className="bg-amber-50 text-amber-950"><AlertTriangle size={14} className="mr-1" aria-hidden="true" />{warning}</Badge>)}</div> : null}
          </Card>
        ))}
        {!suppliers.length ? <Card className="p-8 text-center text-sm text-muted">Chưa có nhà cung cấp phù hợp. Migration không tạo dữ liệu mẫu.</Card> : null}
      </div>
    </main>
  );
}
