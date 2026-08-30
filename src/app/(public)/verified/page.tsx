import type { Metadata } from "next";
import Link from "next/link";
import { Camera, CheckCircle2, CloudSun, Eye, Mountain, RefreshCcw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Tiêu chuẩn thẩm định Tà Xùa Trip",
  description: "Cách Tà Xùa Trip kiểm tra đúng phòng, View Thật, Cloud View, đường vào, bằng chứng 360° và thời hạn xác minh.",
  alternates: { canonical: "/verified" },
};

const cloudRubric = [
  ["30 điểm", "Thấy trực tiếp thung lũng hoặc lòng chảo mây"],
  ["20 điểm", "Độ rộng góc nhìn hữu dụng"],
  ["15 điểm", "Mức độ ít vật cản"],
  ["15 điểm", "Khả năng ngắm từ giường"],
  ["10 điểm", "Vị trí ngắm riêng tư"],
  ["5 điểm", "Hướng đón bình minh"],
  ["5 điểm", "Chất lượng và độ mới của bằng chứng"],
] as const;

export default function VerifiedPage() {
  return (
    <main className="bg-cream pb-20">
      <section className="trip-detail-hero px-5 py-14 text-white sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl"><Badge className="bg-white text-pine"><ShieldCheck size={16} />TÀ XÙA TRIP · ĐÃ THẨM ĐỊNH</Badge><h1 className="mt-5 max-w-4xl font-display text-5xl font-bold sm:text-7xl">Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">Tiêu chuẩn thẩm định giúp bạn biết thông tin nào đã được kiểm tra, bằng chứng thuộc đúng phòng nào và kết quả còn hiệu lực đến khi nào.</p><Link href="/stay" className={buttonVariants({ variant: "accent", size: "lg", className: "mt-7" })}>Tìm phòng theo nhu cầu</Link></div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-14 px-5 py-12 sm:px-8">
        <section aria-labelledby="meaning-title"><p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">Chúng tôi kiểm tra điều gì?</p><h2 id="meaning-title" className="mt-2 font-display text-4xl font-bold text-pine">Mỗi badge có một ý nghĩa rõ ràng</h2><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5"><CheckCircle2 className="text-success" aria-hidden="true" /><h3 className="mt-4 font-bold text-pine">Nơi lưu trú đã thẩm định</h3><p className="mt-2 text-sm leading-6 text-muted">Danh tính, địa điểm và thông tin liên hệ của nơi lưu trú đã được đối chiếu.</p></Card>
          <Card className="p-5"><ShieldCheck className="text-success" aria-hidden="true" /><h3 className="mt-4 font-bold text-pine">Loại phòng đã thẩm định</h3><p className="mt-2 text-sm leading-6 text-muted">Thông tin của đúng loại phòng và bằng chứng gắn với phòng đã được xem xét.</p></Card>
          <Card className="p-5"><Eye className="text-copper" aria-hidden="true" /><h3 className="mt-4 font-bold text-pine">Cloud View đã thẩm định</h3><p className="mt-2 text-sm leading-6 text-muted">Đánh giá vị trí nhìn thực tế từ đúng loại phòng, không phải dự báo có mây.</p></Card>
          <Card className="p-5"><Mountain className="text-copper" aria-hidden="true" /><h3 className="mt-4 font-bold text-pine">Đường vào đã thẩm định</h3><p className="mt-2 text-sm leading-6 text-muted">Đường vào, phương tiện tiếp cận, mặt đường, đoạn khó và chỗ đỗ đã được ghi nhận có thời hạn.</p></Card>
        </div></section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]" aria-labelledby="view-that-title"><Card className="bg-pine p-6 text-white"><Camera className="text-copper" aria-hidden="true" /><h2 id="view-that-title" className="mt-4 font-display text-3xl font-bold">VIEW THẬT</h2><p className="mt-4 leading-8 text-white/75">Ảnh và panorama phải thuộc đúng phòng hoặc đúng vị trí ngắm. Chúng tôi phân biệt ảnh trong phòng với ảnh từ ban công, cửa sổ, cạnh giường hoặc sân hiên. Ảnh flycam và ảnh khu chung không được dùng để đại diện cho view riêng của phòng.</p></Card><Card className="p-6"><h3 className="font-display text-3xl font-bold text-pine">360° có nhãn vị trí</h3><p className="mt-3 leading-7 text-muted">Ảnh toàn cảnh được ghi rõ là <strong>Phòng</strong> hay <strong>Vị trí ngắm view</strong>. Trình xem chỉ tải ảnh lớn khi bạn mở, hỗ trợ kéo/chạm/phím mũi tên và luôn có liên kết ảnh gốc nếu chế độ tương tác không hoạt động.</p></Card></section>

        <section aria-labelledby="rubric-title"><div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">Cách chúng tôi chấm Cloud View</p><h2 id="rubric-title" className="mt-2 font-display text-4xl font-bold text-pine">100 điểm từ các thành phần có thể kiểm tra</h2><p className="mt-4 leading-7 text-muted">Người kiểm tra không nhập trực tiếp điểm 9,2. Hệ thống cộng các thành phần bên dưới và chia cho 10; giới hạn của từng phần được kiểm soát nhất quán.</p></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{cloudRubric.map(([points, label]) => <Card key={label} className="flex gap-4 p-4"><span className="min-w-20 font-bold text-copper-strong">{points}</span><span className="text-sm leading-6 text-muted">{label}</span></Card>)}</div><p className="mt-5 rounded-3xl bg-surface p-5 text-sm leading-7 text-muted"><strong className="text-pine">Quan trọng:</strong> Cloud View Score đo chất lượng vật lý của vị trí nhìn từ phòng. Nó không phải xác suất săn được mây, không dự báo thời tiết và không bảo đảm có biển mây.</p></section>

        <section className="grid gap-5 sm:grid-cols-2" aria-labelledby="freshness-title"><Card className="p-6"><RefreshCcw className="text-copper" aria-hidden="true" /><h2 id="freshness-title" className="mt-4 font-display text-3xl font-bold text-pine">Xác minh có thời hạn</h2><p className="mt-3 leading-7 text-muted">Nơi lưu trú, loại phòng, Cloud View và 360° thường được xem lại sau 12 tháng. Đường vào thường được xem lại sau 6 tháng và cần kiểm tra sớm hơn khi có thay đổi đường, công trình hoặc thời tiết lớn. Nhãn tự biến mất khi hết hạn.</p></Card><Card className="p-6"><CloudSun className="text-copper" aria-hidden="true" /><h2 className="mt-4 font-display text-3xl font-bold text-pine">Những điều nhãn thẩm định không bảo đảm</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted"><li>Không bảo đảm mây hoặc thời tiết.</li><li>Không xác nhận phòng còn trống theo ngày.</li><li>Không xác nhận hay bảo đảm giá.</li><li>Không bảo đảm đường luôn an toàn trong mọi điều kiện tương lai.</li><li>Không phải chứng nhận pháp lý.</li></ul></Card></section>
      </div>
    </main>
  );
}
