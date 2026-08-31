import type { Metadata, Viewport } from "next";
import { Allura, Be_Vietnam_Pro } from "next/font/google";
import { getPublicPageRobots } from "@/config/seo";
import { getSiteUrl, SITE } from "@/config/site";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

const allura = Allura({
  subsets: ["vietnamese", "latin"],
  weight: "400",
  display: "swap",
  variable: "--font-trip-script",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: "/" },
  robots: getPublicPageRobots(),
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#083D76",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${allura.variable}`} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
