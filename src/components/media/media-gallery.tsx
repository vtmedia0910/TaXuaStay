import { Badge } from "@/components/ui/badge";
import type { MediaAssetDto } from "@/features/media/types";

function MediaFrame({ asset }: { asset: MediaAssetDto }) {
  if (asset.media_type === "video") {
    return (
      <video
        className="aspect-[4/3] w-full rounded-3xl bg-pine object-cover"
        controls
        preload="metadata"
        poster={asset.thumbnail_url ?? undefined}
      >
        <source src={asset.url} />
        Trình duyệt không hỗ trợ video này.
      </video>
    );
  }

  return (
    // Public assets have passed HTTPS validation and database review before RLS exposes them.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.thumbnail_url ?? asset.url}
      alt={asset.alt_text}
      loading="lazy"
      className="aspect-[4/3] w-full rounded-3xl bg-mist object-cover"
    />
  );
}

export function MediaGallery({ assets }: { assets: MediaAssetDto[] }) {
  if (!assets.length) {
    return (
      <div className="grid min-h-52 place-items-center rounded-[2rem] border border-dashed border-line bg-mist/50 p-6 text-center text-sm text-muted">
        Chưa có media đã được kiểm duyệt để hiển thị công khai.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {assets.map((asset, index) => (
        <figure key={asset.id} className={index === 0 ? "sm:col-span-2" : undefined}>
          <div className="relative">
            <MediaFrame asset={asset} />
            {asset.media_type === "panorama_360" ? (
              <Badge className="absolute left-3 top-3 bg-pine text-white">360° panorama</Badge>
            ) : null}
          </div>
          {asset.caption ? (
            <figcaption className="mt-2 px-2 text-sm leading-6 text-muted">{asset.caption}</figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
