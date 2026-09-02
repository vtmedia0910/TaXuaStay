import type { Metadata } from "next";
import { AssistantExperience } from "@/components/trip/assistant-experience";
import { getPublicAssistantReadiness } from "@/features/ai/public-readiness";

export const metadata: Metadata = {
  title: "Trợ lý Tà Xùa Trip",
  description: "Hỏi về nơi ở, dữ kiện đã xác minh, giá, tình trạng phòng và chuyến đi từ dữ liệu Tà Xùa Trip.",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ prompt?: string }> }) {
  const [query, readiness] = await Promise.all([searchParams, getPublicAssistantReadiness()]);
  return <AssistantExperience initialPrompt={query.prompt ?? ""} readiness={readiness} />;
}
