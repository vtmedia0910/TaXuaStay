import type { Metadata } from "next";
import { TripFinderExperience } from "@/components/trip/trip-finder-experience";
import { getPublicPageRobots } from "@/config/seo";
import { getTripFinderCandidateSet } from "@/features/trip-finder/data";
import { parseTripFinderParams, type RawTripFinderParams } from "@/features/trip-finder/params";
import { resolveTripFinder } from "@/features/trip-finder/resolver";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawTripFinderParams> }): Promise<Metadata> {
  const raw = await searchParams;
  const hasState = Object.keys(raw).length > 0;
  return {
    title: "Tìm chuyến đi Tà Xùa theo nhu cầu thật",
    description: "Đối chiếu nơi ở, gói dịch vụ và xe máy bằng dữ liệu thật; xem lý do phù hợp, điều cần lưu ý và bước xác nhận tiếp theo.",
    alternates: { canonical: "/trip-finder" },
    robots: getPublicPageRobots(hasState ? { index: false, follow: true } : {}),
    openGraph: {
      title: "Tìm chuyến đi | Tà Xùa Trip",
      description: "Gợi ý có giải thích từ dữ liệu công khai hiện có, không tạo giá hoặc tình trạng giả.",
    },
  };
}

export default async function TripFinderPage({ searchParams }: { searchParams: Promise<RawTripFinderParams> }) {
  const parsed = parseTripFinderParams(await searchParams);
  if (!parsed.showResults) return <TripFinderExperience parsed={parsed} />;
  const candidateSet = await getTripFinderCandidateSet(parsed.intent);
  const resolution = resolveTripFinder({ intent: parsed.intent, candidates: candidateSet.candidates });
  return <TripFinderExperience parsed={parsed} candidateSet={candidateSet} resolution={resolution} />;
}
