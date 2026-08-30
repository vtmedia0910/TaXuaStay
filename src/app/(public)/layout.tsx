import { TripFooter } from "@/components/trip/trip-footer";
import { TripHeader } from "@/components/trip/trip-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream">
      <TripHeader />
      {children}
      <TripFooter />
    </div>
  );
}
