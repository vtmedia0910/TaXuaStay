import Link from "next/link";
import { AlertTriangle, ImageOff, MapPinOff, Pencil, Plus, Warehouse } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { archivePropertyAction } from "@/features/properties/actions";
import { getAdminProperties } from "@/features/properties/data";

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [properties, params] = await Promise.all([getAdminProperties(), searchParams]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="Homestays / Properties"
        description="Quản lý cơ sở lưu trú, dữ liệu vị trí và trạng thái xuất bản."
        action={<Link href="/admin/properties/new" className={buttonVariants()}><Plus size={18} aria-hidden="true" />Thêm nơi lưu trú</Link>}
      />
      <FormFeedback saved={params.saved} error={params.error} />
      <div className="grid gap-4">
        {properties.map((property) => {
          const warnings = [
            property.media_count === 0 && { icon: ImageOff, label: "Thiếu media" },
            property.latitude === null && { icon: MapPinOff, label: "Thiếu vị trí" },
            property.room_count === 0 && { icon: Warehouse, label: "Chưa có phòng" },
          ].filter(Boolean) as Array<{ icon: typeof AlertTriangle; label: string }>;

          return (
            <Card key={property.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2"><Badge>{property.property_type}</Badge><Badge className={property.publish_status === "published" ? "text-success" : "bg-copper/10 text-copper-strong"}>{property.publish_status}</Badge></div>
                  <h2 className="mt-3 font-display text-2xl font-bold text-pine">{property.name}</h2>
                  <p className="mt-1 text-sm text-muted">{property.area_name} · {property.room_count} loại phòng · {property.media_count} media property</p>
                </div>
                <Link href={`/admin/properties/${property.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Pencil size={16} aria-hidden="true" />Sửa</Link>
              </div>
              {warnings.length ? <div className="mt-4 flex flex-wrap gap-2">{warnings.map(({ icon: Icon, label }) => <Badge key={label} className="bg-red-50 text-danger"><Icon size={14} className="mr-1" aria-hidden="true" />{label}</Badge>)}</div> : <p className="mt-4 text-sm font-bold text-success">✓ Dữ liệu nền tảng đã đủ</p>}
              {property.publish_status !== "archived" ? (
                <form action={archivePropertyAction} className="mt-4 border-t border-line pt-3">
                  <input type="hidden" name="id" value={property.id} />
                  <button className="min-h-11 text-sm font-bold text-danger hover:text-danger-strong">Lưu trữ / ngừng xuất bản</button>
                </form>
              ) : null}
            </Card>
          );
        })}
        {!properties.length ? <Card className="p-6 text-center text-sm text-muted">Chưa có property. Tạo bản ghi thật đầu tiên khi dữ liệu đã sẵn sàng.</Card> : null}
      </div>
    </main>
  );
}
