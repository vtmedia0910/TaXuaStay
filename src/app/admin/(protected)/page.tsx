import { CircleCheckBig, Database, House, Layers3, Sparkles } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAdminAmenities } from "@/features/amenities/data";
import { getAdminProperties } from "@/features/properties/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  const [properties, amenities] = await Promise.all([getAdminProperties(), getAdminAmenities()]);
  const roomCount = properties.reduce((total, property) => total + property.room_count, 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="Tổng quan"
        description="Quản lý nội dung lưu trú, bằng chứng xác minh và giá theo ngày. Giá không đồng nghĩa với tình trạng phòng."
      />
      <FormFeedback error={params.error} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <Database className="text-pine" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-bold text-pine">Supabase Stay</h2>
          <Badge className={configured ? "mt-3 text-success" : "mt-3 bg-copper/10 text-copper-strong"}>
            {configured ? "Đã nhận cấu hình công khai" : "Chưa cấu hình"}
          </Badge>
          <p className="mt-3 text-sm leading-6 text-muted">
            Kết nối phải thuộc project Stay riêng; ứng dụng hiện chỉ cần các biến Supabase công khai và RLS.
          </p>
        </Card>
        <Card className="p-5">
          <Layers3 className="text-pine" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-bold text-pine">Phạm vi hiện tại</h2>
          <Badge className="mt-3 text-success">PHASE 5</Badge>
          <p className="mt-3 text-sm leading-6 text-muted">
            Nội dung, tìm kiếm, xác minh và bảng giá đã có; tình trạng phòng và đặt phòng chưa được triển khai.
          </p>
        </Card>
        <Card className="p-5">
          <House className="text-pine" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-bold text-pine">Nội dung lưu trú</h2>
          <p className="mt-3 text-3xl font-bold text-copper-strong">{properties.length}</p>
          <p className="mt-1 text-sm text-muted">properties · {roomCount} room types</p>
        </Card>
        <Card className="p-5">
          <Sparkles className="text-pine" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-bold text-pine">Amenity catalog</h2>
          <p className="mt-3 text-3xl font-bold text-copper-strong">{amenities.length}</p>
          <p className="mt-1 text-sm text-muted">mục chuẩn hóa</p>
        </Card>
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-[1.75rem] border border-line bg-pine-soft p-5 text-pine">
        <CircleCheckBig className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-sm leading-6">
          Hạ tầng đăng nhập và phân quyền chỉ chấp nhận role <strong>admin</strong> hoặc{" "}
          <strong>staff</strong> từ <code>app_metadata</code>.
        </p>
      </div>
    </main>
  );
}
