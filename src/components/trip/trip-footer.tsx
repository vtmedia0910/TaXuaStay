import Link from "next/link";
import { TripLogo } from "@/components/trip/trip-logo";
import { PUBLIC_ROUTES } from "@/config/routes";
import { findCmsSection } from "@/features/cms/defaults";
import type { CmsPage } from "@/features/cms/types";

function Planned({ children }: { children: React.ReactNode }) {
  return <span className="text-white/55">{children} <span className="text-[0.65rem] uppercase tracking-wide">Sắp có</span></span>;
}

export function TripFooter({ cms }: { cms?: CmsPage }) {
  const intro = cms ? findCmsSection(cms, "footer_intro") : null;
  return (
    <footer className="bg-pine px-5 py-12 text-sm text-white/75 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <TripLogo inverse />
          <p className="mt-5 max-w-sm leading-7">{intro?.body ?? "Nền tảng du lịch địa phương giúp bạn biết rõ nơi ở, bằng chứng và điều cần lưu ý trước khi lên đường."}</p>
          <p className="mt-4 font-semibold text-white">THẬT · HIỂU · TRỌN VẸN</p>
        </div>
        <div>
          <h2 className="font-bold tracking-[0.12em] text-white">DỊCH VỤ</h2>
          <div className="mt-4 grid gap-3">
            <Link href={PUBLIC_ROUTES.stay} className="hover:text-white">Lưu trú</Link>
            <Planned>Combo</Planned>
            <Planned>Xe khách</Planned>
            <Planned>Xe máy</Planned>
            <Link href="/#cloud-view" className="hover:text-white">Săn mây / Cloud</Link>
          </div>
        </div>
        <div>
          <h2 className="font-bold tracking-[0.12em] text-white">HỖ TRỢ</h2>
          <div className="mt-4 grid gap-3">
            <Planned>FAQ</Planned>
            <Planned>Chính sách</Planned>
            <Planned>Liên hệ</Planned>
          </div>
        </div>
        <div>
          <h2 className="font-bold tracking-[0.12em] text-white">VỀ CHÚNG TÔI</h2>
          <div className="mt-4 grid gap-3">
            <Link href={PUBLIC_ROUTES.verification} className="hover:text-white">Phương pháp thẩm định</Link>
            <Link href="/#principles" className="hover:text-white">Cam kết</Link>
            <Planned>Đối tác</Planned>
            <Planned>Cẩm nang</Planned>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-6 text-xs text-white/55">
        <p>© {new Date().getFullYear()} Tà Xùa Trip.</p>
        <p>Đi thật. Biết trước.</p>
      </div>
    </footer>
  );
}
