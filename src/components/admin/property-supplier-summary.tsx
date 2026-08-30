import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CONTACT_TYPE_LABELS, PROPERTY_RELATIONSHIP_LABELS, SUPPLIER_STATUS_LABELS } from "@/features/suppliers/policy";
import type { PropertySupplierSummary as Summary } from "@/features/suppliers/types";

export function PropertySupplierSummary({ suppliers }: { suppliers: Summary[] }) {
  return (
    <Card className="mb-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-sky">Nhà cung cấp</p><p className="mt-1 text-sm text-muted">Quan hệ vận hành riêng tư; không thay đổi dữ liệu công khai của cơ sở.</p></div>
        <Link href="/admin/suppliers" className={buttonVariants({ variant: "secondary", size: "sm" })}>Quản lý quan hệ</Link>
      </div>
      <div className="mt-4 grid gap-3">
        {suppliers.map((supplier) => (
          <div key={`${supplier.supplier_id}-${supplier.relationship_type}`} className="rounded-2xl border border-line p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><Link href={`/admin/suppliers/${supplier.supplier_id}/edit`} className="font-bold text-pine hover:text-sky">{supplier.supplier_name}</Link><p className="mt-1 font-mono text-xs text-muted">{supplier.supplier_code}</p></div><div className="flex flex-wrap gap-2"><Badge>{PROPERTY_RELATIONSHIP_LABELS[supplier.relationship_type]}</Badge>{supplier.is_primary ? <Badge>Đầu mối chính</Badge> : null}<Badge className="bg-stone-100 text-muted">{SUPPLIER_STATUS_LABELS[supplier.supplier_status]}</Badge></div></div>
            {supplier.primary_contact ? <p className="mt-3 text-sm text-muted"><strong className="text-pine">Liên hệ chính:</strong> {supplier.primary_contact.contact_name} · {CONTACT_TYPE_LABELS[supplier.primary_contact.contact_type]}{supplier.primary_contact.phone ? ` · ${supplier.primary_contact.phone}` : ""}</p> : <p className="mt-3 text-sm font-bold text-copper-strong">Chưa có liên hệ chính.</p>}
          </div>
        ))}
        {!suppliers.length ? <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">Cơ sở này chưa được gắn với nhà cung cấp nào.</p> : null}
      </div>
    </Card>
  );
}
