import { TripFooter } from "@/components/trip/trip-footer";
import { TripHeader } from "@/components/trip/trip-header";
import { AssistantLauncher } from "@/components/trip/assistant-launcher";
import { getPublicAssistantReadiness } from "@/features/ai/public-readiness";
import { getPublicCmsPage } from "@/features/cms/data";
import { hasPublicPackages } from "@/features/packages/data";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [footerCms, packagesAvailable, assistantReadiness] = await Promise.all([
    getPublicCmsPage("footer"),
    hasPublicPackages(),
    getPublicAssistantReadiness(),
  ]);
  return (
    <div className="trip-public-shell min-h-dvh bg-cream">
      <TripHeader />
      {children}
      <AssistantLauncher readiness={assistantReadiness} />
      <TripFooter cms={footerCms} packagesAvailable={packagesAvailable} />
    </div>
  );
}
