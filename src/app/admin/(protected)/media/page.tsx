import Link from "next/link";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminMediaAssets } from "@/features/media/data";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRoomOptions } from "@/features/rooms/data";

export default async function AdminMediaPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [properties, rooms, params] = await Promise.all([getAdminPropertyOptions(), getAdminRoomOptions(), searchParams]);
  const assets = await getAdminMediaAssets(properties, rooms);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AdminPageHeader title="Media" description="Asset gắn đúng property/room và có metadata bằng chứng; Phase 2 dùng URL HTTPS." action={<Link href="/admin/media/new" className={buttonVariants()}><Plus size={18} />Thêm media</Link>} />
      <FormFeedback saved={params.saved} error={params.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        {assets.map((asset) => (
          <Card key={asset.id} className="p-5">
            <div className="flex flex-wrap gap-2"><Badge>{asset.media_type}</Badge><Badge>{asset.evidence_type}</Badge><Badge className={asset.is_verified ? "text-success" : "bg-copper/10 text-copper-strong"}>{asset.is_verified ? "public-approved" : "private/draft"}</Badge></div>
            <h2 className="mt-4 font-bold text-pine">{asset.owner_name}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{asset.alt_text}</p>
            <div className="mt-4 flex flex-wrap gap-2"><a href={asset.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}><ExternalLink size={16} />Mở asset</a><Link href={`/admin/media/${asset.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Pencil size={16} />Sửa</Link></div>
          </Card>
        ))}
        {!assets.length ? <Card className="p-6 text-center text-sm text-muted sm:col-span-2">Chưa có media. Không có dữ liệu giả được seed.</Card> : null}
      </div>
    </main>
  );
}
