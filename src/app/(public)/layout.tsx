import { TripFooter } from "@/components/trip/trip-footer";
import { TripHeader } from "@/components/trip/trip-header";
import { getPublicCmsPage } from "@/features/cms/data";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const footerCms = await getPublicCmsPage("footer");
  return (
    <div className="min-h-dvh bg-cream">
      <TripHeader />
      {children}
      <TripFooter cms={footerCms} />
    </div>
  );
}
