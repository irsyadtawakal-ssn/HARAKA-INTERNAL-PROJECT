import { LICENSE_LABEL, STATUS_LABEL } from "@/lib/labels";
import type { AssetFunnel, AssetStatus, LicenseStatus } from "@/lib/types";

/** Warna pigmen per status; dipakai strip kartu dan titik chip. */
export const PIGMENT: Record<AssetStatus, string> = {
  uploading: "bg-pigment-processing",
  processing: "bg-pigment-processing",
  ready: "bg-pigment-ready",
  analyzed: "bg-pigment-analyzed",
  approved: "bg-pigment-approved",
  rejected: "bg-pigment-rejected",
  archived: "bg-pigment-archived",
  failed: "bg-pigment-failed",
};

export function StatusChip({ status }: { status: AssetStatus }) {
  const busy = status === "processing" || status === "uploading";
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
      <span className={`size-2 rounded-full ${PIGMENT[status]} ${busy ? "animate-pulse" : ""}`} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Cap batch funnel: lingkaran berisi A / B / AB. Belum ditentukan = lingkaran putus-putus,
 * supaya aset yang belum dipetakan ke funnel langsung terlihat di galeri.
 */
export function FunnelStamp({ funnel, size = "sm" }: { funnel: AssetFunnel | null; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "size-11 text-base" : "size-8 text-[13px]";
  if (!funnel) {
    return (
      <span
        className={`${dim} grid place-items-center rounded-full border-[1.5px] border-dashed border-ink-faint bg-surface/90 font-semibold text-ink-faint`}
        title="Funnel belum ditentukan"
      >
        ?
      </span>
    );
  }
  const text = funnel === "both" ? "AB" : funnel;
  return (
    <span
      className={`${dim} grid place-items-center rounded-full border-[1.5px] border-ink bg-surface/95 font-bold tracking-tight text-ink`}
      title={funnel === "both" ? "Funnel A dan B" : `Funnel ${funnel}`}
    >
      {text}
    </span>
  );
}

export function LicenseBadge({ license }: { license: LicenseStatus }) {
  if (license !== "unknown") return null;
  return (
    <span className="inline-flex rounded-md bg-amber-wash px-1.5 py-0.5 text-[12px] font-medium text-pigment-processing">
      {LICENSE_LABEL.unknown}
    </span>
  );
}
