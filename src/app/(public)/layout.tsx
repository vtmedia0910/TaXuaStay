import { TripFooter } from "@/components/trip/trip-footer";
import { TripHeader } from "@/components/trip/trip-header";
import { AssistantLauncher } from "@/components/trip/assistant-launcher";
import { getPublicCmsPage } from "@/features/cms/data";
import { hasPublicPackages } from "@/features/packages/data";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [footerCms, packagesAvailable] = await Promise.all([getPublicCmsPage("footer"), hasPublicPackages()]);
  return (
    <div className="trip-public-shell min-h-dvh bg-cream">
      <TripHeader />
      {children}
      <AssistantLauncher />
      <TripFooter cms={footerCms} packagesAvailable={packagesAvailable} />
    </div>
  );
}
