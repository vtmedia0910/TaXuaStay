import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminDestinations } from "@/features/destinations/data";

export default async function AdminDestinationsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [destinations, params] = await Promise.all([getAdminDestinations(), searchParams]);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AdminPageHeader title="Điểm đến" description="Miền địa lý sở hữu các nơi lưu trú. V2 Phase 1 khởi tạo Tà Xùa mà không bịa tọa độ hoặc độ cao." action={<Link href="/admin/destinations/new" className={buttonVariants()}><Plus size={18} />Thêm điểm đến</Link>} />
      <FormFeedback saved={params.saved} error={params.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        {destinations.map((destination) => (
          <Card key={destination.id} className="p-5">
            <div className="flex flex-wrap gap-2"><Badge>{destination.country_code}</Badge><Badge className={destination.publish_status === "published" ? "text-success" : "bg-copper/10 text-copper-strong"}>{destination.publish_status}</Badge></div>
            <h2 className="mt-4 font-display text-2xl font-bold text-pine">{destination.name}</h2>
            <p className="mt-1 text-sm text-muted">/{destination.slug} · {destination.timezone}</p>
            <Link href={`/admin/destinations/${destination.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-4" })}><Pencil size={16} />Sửa</Link>
          </Card>
        ))}
      </div>
    </main>
  );
}
