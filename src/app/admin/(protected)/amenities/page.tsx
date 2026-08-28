import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminAmenities } from "@/features/amenities/data";

export default async function AdminAmenitiesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [amenities, params] = await Promise.all([getAdminAmenities(), searchParams]);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AdminPageHeader title="Amenities" description="Catalog chuẩn dùng chung qua bảng nối property/room." action={<Link href="/admin/amenities/new" className={buttonVariants()}><Plus size={18} />Thêm amenity</Link>} />
      <FormFeedback saved={params.saved} error={params.error} />
      <div className="grid gap-3 sm:grid-cols-2">
        {amenities.map((amenity) => <Card key={amenity.id} className="flex items-start justify-between gap-3 p-4"><div><div className="flex gap-2"><Badge>{amenity.category}</Badge><Badge className={amenity.is_active ? "text-success" : "bg-red-50 text-danger"}>{amenity.is_active ? "active" : "inactive"}</Badge></div><h2 className="mt-3 font-bold text-pine">{amenity.name}</h2><p className="mt-1 text-xs text-muted">{amenity.slug} · sort {amenity.sort_order}</p></div><Link href={`/admin/amenities/${amenity.id}/edit`} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label={`Sửa ${amenity.name}`}><Pencil size={17} /></Link></Card>)}
        {!amenities.length ? <Card className="p-6 text-center text-sm text-muted sm:col-span-2">Chưa có amenity.</Card> : null}
      </div>
    </main>
  );
}
