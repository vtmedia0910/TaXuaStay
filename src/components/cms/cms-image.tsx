import Image from "next/image";
import { resolveCmsMediaUrl } from "@/features/cms/media-url";
import type { CmsMediaAsset } from "@/features/cms/types";
import { cn } from "@/lib/utils";

export function CmsImage({ media, className, priority = false, sizes = "100vw" }: {
  media: CmsMediaAsset | null | undefined;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const src = resolveCmsMediaUrl(media);
  if (!src || !media) return null;
  const style = { objectPosition: `${media.focal_x}% ${media.focal_y}%` };
  if (media.external_url) {
    // External CMS hosts are intentionally not added to Next remotePatterns. The
    // editor is responsible for the source; CSP/HTTPS and alt text remain enforced.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={media.alt_text} className={cn("object-cover", className)} style={style} loading={priority ? "eager" : "lazy"} />;
  }
  return <Image src={src} alt={media.alt_text} fill className={cn("object-cover", className)} style={style} priority={priority} sizes={sizes} />;
}
