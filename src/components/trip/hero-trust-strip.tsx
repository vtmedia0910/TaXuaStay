import { CalendarCheck2, Camera, MapPinned, MessageSquareMore } from "lucide-react";

const trustItems = [
  { Icon: MapPinned, label: "Thẩm định tại chỗ" },
  { Icon: Camera, label: "Video / ảnh 360°" },
  { Icon: MessageSquareMore, label: "Nói cả ưu & nhược điểm" },
  { Icon: CalendarCheck2, label: "Dữ liệu có ngày xác minh" },
] as const;

export function HeroTrustStrip() {
  return (
    <section className="trip-hero-trust-strip" aria-label="Cam kết quy trình">
      <div>
        {trustItems.map(({ Icon, label }) => (
          <p key={label}>
            <span><Icon size={18} aria-hidden="true" /></span>
            {label}
          </p>
        ))}
      </div>
    </section>
  );
}
