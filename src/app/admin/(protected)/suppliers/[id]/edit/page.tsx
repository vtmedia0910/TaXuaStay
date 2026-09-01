import { notFound } from "next/navigation";
import { Archive } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import {
  PartnerRelationshipForm,
  SupplierContactForm,
  SupplierExternalRefForm,
  SupplierProfileForm,
  SupplierPropertyForm,
} from "@/components/admin/supplier-forms";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAdminUser } from "@/features/admin/auth";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { archiveSupplierAction } from "@/features/suppliers/actions";
import { getAdminSupplier } from "@/features/suppliers/data";
import { PARTNER_STATUS_LABELS, PARTNER_TIER_POLICY, SUPPLIER_STATUS_LABELS, SUPPLIER_TYPE_LABELS } from "@/features/suppliers/policy";
import Link from "next/link";
import { Bot } from "lucide-react";

export default async function EditSupplierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const [user, supplier, properties, feedback] = await Promise.all([
    requireAdminUser(),
    getAdminSupplier(id),
    getAdminPropertyOptions(),
    searchParams,
  ]);
  if (!supplier) notFound();
  const isAdmin = user.role === "admin";
  const archived = supplier.status === "archived";
  const primaryContact = supplier.contacts.find((contact) => contact.is_primary && contact.is_active) ?? null;
  const openPartner = supplier.partner_relationships.find((relationship) => relationship.status !== "ended");
  const endedPartners = supplier.partner_relationships.filter((relationship) => relationship.status === "ended");

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AdminPageHeader title={supplier.display_name} description={`${supplier.supplier_code} · ${SUPPLIER_TYPE_LABELS[supplier.supplier_type]} · ${SUPPLIER_STATUS_LABELS[supplier.status]}`} />
      <FormFeedback saved={feedback.saved} error={feedback.error} />
      <Link href={`/admin/integrations/telegram#supplier-${supplier.id}`} className="mb-5 flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-sky/30 bg-sky/5 px-4 font-bold text-pine"><Bot size={18} />Quản lý nhóm Telegram của Supplier</Link>
      {archived ? <p className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-950">Hồ sơ đã lưu trữ. Hãy tái kích hoạt bằng tài khoản Admin trước khi thêm liên hệ hoặc quan hệ đang hiệu lực.</p> : null}

      <div className="grid gap-8 pb-12">
        {isAdmin ? <SupplierProfileForm supplier={supplier} primaryContact={primaryContact} /> : (
          <Card className="p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-sky">Thông tin nhà cung cấp</p><p className="mt-2 text-sm leading-6 text-muted">Staff có quyền xem và xử lý đầu mối/liên kết cơ sở. Chỉ Admin thay đổi danh tính và vòng đời nhà cung cấp.</p></Card>
        )}

        <section id="contacts" className="scroll-mt-6">
          <div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-sky">Liên hệ</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">Đầu mối vận hành riêng tư</h2><p className="mt-1 text-sm text-muted">Mỗi liên hệ cần ít nhất điện thoại, email hoặc Zalo. Chỉ một liên hệ đang hoạt động được đánh dấu chính.</p></div>
          <div className="grid gap-4">{supplier.contacts.map((contact) => <details key={contact.id} className="group"><summary className="cursor-pointer list-none rounded-2xl border border-line bg-mist p-4 font-bold text-pine">{contact.contact_name}{contact.is_primary ? " · Liên hệ chính" : ""}{!contact.is_active ? " · Đã tắt" : ""}</summary><div className="mt-2"><SupplierContactForm supplierId={supplier.id} contact={contact} /></div></details>)}{!archived ? <SupplierContactForm supplierId={supplier.id} /> : null}</div>
        </section>

        <section id="properties" className="scroll-mt-6">
          <div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-sky">Cơ sở / dịch vụ liên kết</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">Quan hệ với nơi lưu trú</h2><p className="mt-1 text-sm text-muted">Nhiều-nhiều, có vai trò và thời hạn; kết thúc bằng ngày thay vì xóa lịch sử.</p></div>
          <div className="grid gap-4">{supplier.properties.map((link) => <details key={link.id} className="group"><summary className="cursor-pointer list-none rounded-2xl border border-line bg-mist p-4 font-bold text-pine">{link.property_name}{link.is_primary ? " · Đầu mối chính" : ""}{link.valid_until ? ` · Đến ${link.valid_until}` : ""}</summary><div className="mt-2"><SupplierPropertyForm supplierId={supplier.id} properties={properties} link={link} /></div></details>)}{!archived ? <SupplierPropertyForm supplierId={supplier.id} properties={properties} /> : null}</div>
        </section>

        <section id="partner" className="scroll-mt-6">
          <div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-sky">Quan hệ đối tác</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">Quan hệ với Tà Xùa Trip</h2><p className="mt-1 text-sm text-muted">Supplier tồn tại không đồng nghĩa là đối tác đang hoạt động. Tier hoàn toàn tách khỏi verification.</p></div>
          {isAdmin && !archived ? <PartnerRelationshipForm supplierId={supplier.id} relationship={openPartner} /> : openPartner ? <Card className="p-5"><div className="flex flex-wrap gap-2"><Badge>{PARTNER_STATUS_LABELS[openPartner.status]}</Badge><Badge>{PARTNER_TIER_POLICY[openPartner.tier].label}</Badge></div><p className="mt-3 text-sm text-muted">Chỉ Admin thay đổi quan hệ đối tác.</p></Card> : <Card className="p-5 text-sm text-muted">Chưa có quan hệ đối tác đang mở.</Card>}
          {endedPartners.length ? <div className="mt-4 rounded-2xl border border-line p-4"><h3 className="font-bold text-pine">Lịch sử đã kết thúc</h3><ul className="mt-2 grid gap-2 text-sm text-muted">{endedPartners.map((relationship) => <li key={relationship.id}>{PARTNER_TIER_POLICY[relationship.tier].label} · {relationship.started_at ?? "chưa ghi ngày bắt đầu"} → {relationship.ended_at}</li>)}</ul></div> : null}
        </section>

        <section id="references" className="scroll-mt-6">
          <div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-sky">Tham chiếu hệ thống</p><h2 className="mt-1 font-display text-2xl font-bold text-pine">External identity</h2><p className="mt-1 text-sm text-muted">Chỉ mã tham chiếu không nhạy cảm. Không lưu token, secret, fleet hay dữ liệu vận hành Biker.</p></div>
          <div className="grid gap-4">{supplier.external_refs.map((externalRef) => isAdmin ? <SupplierExternalRefForm key={externalRef.id} supplierId={supplier.id} externalRef={externalRef} /> : <Card key={externalRef.id} className="p-4"><p className="font-mono text-sm font-bold text-pine">{externalRef.system_key} · {externalRef.external_reference}</p><p className="mt-1 text-xs text-muted">{externalRef.is_active ? "Đang hoạt động" : "Đã tắt"}</p></Card>)}{isAdmin && !archived ? <SupplierExternalRefForm supplierId={supplier.id} /> : null}</div>
        </section>

        {isAdmin && !archived ? <Card className="border-danger/30 p-5"><h2 className="font-display text-xl font-bold text-danger">Vùng nguy hiểm</h2><p className="mt-1 text-sm text-muted">Lưu trữ sẽ tắt liên hệ/tham chiếu, kết thúc quan hệ đối tác và đóng các liên kết đang mở. Lịch sử không bị xóa.</p><form action={archiveSupplierAction} className="mt-4"><input type="hidden" name="id" value={supplier.id} /><SubmitButton label="Lưu trữ nhà cung cấp" icon={<Archive size={18} aria-hidden="true" />} variant="danger" confirmation={"LƯU TRỮ NHÀ CUNG CẤP?\n\nCác liên hệ và quan hệ đang hoạt động sẽ được kết thúc/lưu trữ nhưng lịch sử không bị xóa."} /></form></Card> : null}
      </div>
    </main>
  );
}
