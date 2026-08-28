import { CircleCheckBig, Database, Layers3 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function AdminHomePage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="Tổng quan"
        description="Baseline quản trị tối thiểu cho PHASE 0. Các miền lưu trú chỉ được thêm ở phase đã duyệt."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <Database className="text-pine" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-bold text-pine">Supabase Stay</h2>
          <Badge className={configured ? "mt-3 text-success" : "mt-3 bg-copper/10 text-copper-strong"}>
            {configured ? "Đã nhận cấu hình công khai" : "Chưa cấu hình"}
          </Badge>
          <p className="mt-3 text-sm leading-6 text-muted">
            Kết nối phải thuộc project Stay riêng; service-role key chỉ được dùng ở server.
          </p>
        </Card>
        <Card className="p-5">
          <Layers3 className="text-pine" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-bold text-pine">Phạm vi hiện tại</h2>
          <Badge className="mt-3 text-success">PHASE 0</Badge>
          <p className="mt-3 text-sm leading-6 text-muted">
            Chưa có bảng dữ liệu, migration hoặc màn hình nghiệp vụ Homestay, Rooms, Booking,
            Availability hay Rates.
          </p>
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
