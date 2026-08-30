import { notFound } from "next/navigation";
import { HomeExperience } from "@/app/(public)/page";
import { StayIntro } from "@/app/(public)/tim-phong/page";
import { getAdminCmsPage } from "@/features/cms/data";
import { searchPublicRooms } from "@/features/search/data";
import { DEFAULT_ROOM_SEARCH_PARAMS } from "@/features/search/params";
import { getPublicSiteSettings } from "@/features/settings/data";

export default async function CmsPreviewPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  if (page === "home") {
    const [cms, settings, rooms] = await Promise.all([getAdminCmsPage("home"), getPublicSiteSettings(), searchPublicRooms(DEFAULT_ROOM_SEARCH_PARAMS)]);
    if (!cms) notFound();
    return <HomeExperience cms={cms} settings={settings} roomResponse={rooms} preview />;
  }
  if (page === "stay") {
    const cms = await getAdminCmsPage("stay");
    if (!cms) notFound();
    return <main className="min-h-dvh bg-cream"><StayIntro cms={cms} preview /><div className="mx-auto max-w-6xl px-5 py-12 text-muted">Khu vực tìm kiếm và dữ liệu phòng dùng nguyên nguồn vận hành thật, không thuộc bản nháp CMS.</div></main>;
  }
  notFound();
}
