import { Film, ImageIcon } from "lucide-react";
import Link from "next/link";
import { formatBytes, formatDuration } from "@/lib/labels";
import type { Asset } from "@/lib/types";
import { FunnelStamp, LicenseBadge, PIGMENT, StatusChip } from "./asset-marks";

/** Kartu sampel: strip pigmen status di tepi kiri, cap funnel di pojok kanan atas foto. */
export function AssetCard({ asset }: { asset: Asset }) {
  const duration = formatDuration(asset.duration_s);
  const TypeIcon = asset.type === "video" ? Film : ImageIcon;

  return (
    <Link
      href={`/aset/${asset.id}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-[border-color,box-shadow] hover:border-ink-faint hover:shadow-[0_2px_0_0_var(--color-line)]"
    >
      <span className={`absolute inset-y-0 left-0 z-10 w-1 ${PIGMENT[asset.status]}`} aria-hidden />
      <div className="relative aspect-[4/3] bg-well">
        {asset.thumbnail_url ? (
          // Thumbnail dari presigned URL storage (berganti tiap muat ulang), jadi tidak lewat next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.thumbnail_url} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-ink-faint">
            <TypeIcon className="size-8" aria-hidden />
          </div>
        )}
        <div className="absolute top-2.5 right-2.5">
          <FunnelStamp funnel={asset.funnel} />
        </div>
        {duration && (
          <span className="absolute bottom-2 left-3 rounded bg-ink/80 px-1.5 py-0.5 text-[12px] font-medium text-white">
            {duration}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 py-3 pr-3 pl-4">
        <div className="truncate font-medium text-ink" title={asset.original_filename}>
          {asset.original_filename}
        </div>
        <div className="flex items-center gap-2 text-[13px] text-ink-soft">
          <TypeIcon className="size-3.5" aria-hidden />
          <span>{asset.width && asset.height ? `${asset.width}×${asset.height}` : asset.type === "video" ? "Video" : "Foto"}</span>
          <span className="text-ink-faint">{formatBytes(asset.size_bytes)}</span>
          {asset.version > 1 && <span className="text-ink-faint">v{asset.version}</span>}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
          <StatusChip status={asset.status} />
          <LicenseBadge license={asset.license_status} />
        </div>
      </div>
    </Link>
  );
}
