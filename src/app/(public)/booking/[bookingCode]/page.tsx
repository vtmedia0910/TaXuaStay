import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MyTripDashboard } from "@/components/trip/my-trip-dashboard";
import { getPublicBookingStatus } from "@/features/bookings/data";
import { bookingCodeSchema } from "@/features/bookings/schema";
import { buildCustomerTripDashboard } from "@/features/my-trip/policy";
import { getPublicSiteSettings } from "@/features/settings/data";

export const metadata: Metadata = {
  title: "My Trip · Tình trạng chuyến đi",
  description: "Theo dõi dịch vụ, báo giá và bước tiếp theo của chuyến đi Tà Xùa.",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function BookingStatusPage({ params }: { params: Promise<{ bookingCode: string }> }) {
  const { bookingCode } = await params;
  if (!bookingCodeSchema.safeParse(bookingCode).success) notFound();
  const booking = await getPublicBookingStatus(bookingCode);
  if (!booking) notFound();
  const settings = await getPublicSiteSettings();
  return <MyTripDashboard trip={buildCustomerTripDashboard(booking, settings)} />;
}
