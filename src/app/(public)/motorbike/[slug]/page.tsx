import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MotorbikeDetailExperience } from "@/components/trip/motorbike-detail-experience";
import { getPublicPageRobots } from "@/config/seo";
import { getPublicMotorbikeOffering } from "@/features/motorbike/public-data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const offering = await getPublicMotorbikeOffering(slug);
  if (!offering) return { title: "Không tìm thấy lựa chọn xe máy", robots: { index: false, follow: false } };
  return {
    title: `${offering.display_name} · Xe máy Tà Xùa`,
    description: offering.public_description ?? `Thông tin ${offering.display_name}, giá và trạng thái xác nhận từ nguồn Tà Xùa Biker.`,
    alternates: { canonical: `/motorbike/${offering.slug}` },
    robots: getPublicPageRobots(),
  };
}

export default async function MotorbikeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const offering = await getPublicMotorbikeOffering(slug);
  if (!offering) notFound();
  return <MotorbikeDetailExperience offering={offering} />;
}
