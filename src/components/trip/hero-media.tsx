import type { CSSProperties } from "react";
import { getImageProps } from "next/image";
import { resolveCmsMediaUrl } from "@/features/cms/media-url";
import type { CmsMediaAsset } from "@/features/cms/types";

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

function getResponsiveImageProps(media: CmsMediaAsset) {
  const src = resolveCmsMediaUrl(media);
  if (!src) return null;

  if (media.external_url) {
    return {
      src,
      srcSet: src,
      width: media.width ?? 1600,
      height: media.height ?? 900,
    };
  }

  const { props } = getImageProps({
    src,
    alt: media.alt_text,
    width: media.width ?? 1600,
    height: media.height ?? 900,
    sizes: "100vw",
    quality: 75,
  });

  return {
    src: props.src,
    srcSet: props.srcSet,
    width: props.width,
    height: props.height,
  };
}

export function HeroMedia({
  desktop,
  mobile,
}: {
  desktop: CmsMediaAsset | null | undefined;
  mobile: CmsMediaAsset | null | undefined;
}) {
  const mobileMedia = mobile ?? desktop;
  const desktopProps = desktop ? getResponsiveImageProps(desktop) : null;
  const mobileProps = mobileMedia ? getResponsiveImageProps(mobileMedia) : null;

  if (!desktopProps && !mobileProps) return null;

  const fallbackProps = mobileProps ?? desktopProps;
  if (!fallbackProps) return null;
  const renderedMobileMedia = mobileProps ? mobileMedia : desktopProps ? desktop : null;

  const style = {
    "--hero-desktop-position": desktop
      ? `${desktop.focal_x}% ${desktop.focal_y}%`
      : "50% 50%",
    "--hero-mobile-position": renderedMobileMedia
      ? `${renderedMobileMedia.focal_x}% ${renderedMobileMedia.focal_y}%`
      : "50% 50%",
  } as CSSProperties;

  return (
    <picture className="absolute inset-0 block" style={style}>
      <source
        media="(min-width: 1024px)"
        srcSet={desktopProps?.srcSet ?? TRANSPARENT_PIXEL}
        sizes="100vw"
      />
      <img
        src={fallbackProps.src}
        srcSet={fallbackProps.srcSet}
        sizes="100vw"
        width={fallbackProps.width}
        height={fallbackProps.height}
        alt={(desktopProps ? desktop : renderedMobileMedia)?.alt_text ?? ""}
        className="trip-hero-media-image absolute inset-0 size-full object-cover"
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </picture>
  );
}
