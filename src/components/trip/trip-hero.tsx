import { BookOpen, Heart, ShieldCheck } from "lucide-react";
import { HeroMedia } from "@/components/trip/hero-media";
import { HeroSearch } from "@/components/trip/hero-search";
import { HeroTrustStrip } from "@/components/trip/hero-trust-strip";
import type { CmsSection } from "@/features/cms/types";

const brandValues = [
  { Icon: ShieldCheck, title: "THẬT", copy: "Phòng thật, thông tin thật" },
  { Icon: BookOpen, title: "HIỂU", copy: "Biết rõ trước khi chọn" },
  { Icon: Heart, title: "TRỌN VẸN", copy: "Kết nối cả chuyến đi" },
] as const;

export function TripHero({ hero }: { hero: CmsSection | undefined }) {
  return (
    <>
      <section className="trip-home-hero" aria-labelledby="trip-hero-title">
        <div className="absolute inset-0 -z-20 overflow-hidden bg-pine">
          <HeroMedia desktop={hero?.desktop_media} mobile={hero?.mobile_media} />
        </div>
        <div className="trip-home-hero-overlay absolute inset-0 -z-10" />

        <div className="trip-home-hero-content">
          <div className="trip-home-hero-copy">
            <h1 id="trip-hero-title">TÀ XÙA TRIP</h1>
            <p className="trip-home-hero-slogan">Đi thật. Biết trước.</p>
            <p className="trip-home-hero-tagline">Tà Xùa, trước khi bạn đến.</p>
            <p className="trip-home-hero-support">
              Thông tin thật về nơi ở, hành trình và trải nghiệm — để bạn biết rõ trước khi lên đường.
            </p>

            <div className="trip-home-hero-values" aria-label="Giá trị thương hiệu">
              {brandValues.map(({ Icon, title, copy }) => (
                <div key={title}>
                  <span><Icon size={22} strokeWidth={1.8} aria-hidden="true" /></span>
                  <p><strong>{title}</strong><small>{copy}</small></p>
                </div>
              ))}
            </div>
          </div>

          <div className="trip-home-hero-search-wrap">
            <HeroSearch />
          </div>
        </div>
      </section>
      <HeroTrustStrip />
    </>
  );
}
