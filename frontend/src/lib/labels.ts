import type { AssetFunnel, AssetStatus, LicenseStatus, Role } from "./types";

export const STATUS_LABEL: Record<AssetStatus, string> = {
  uploading: "Belum selesai diunggah",
  processing: "Sedang diproses",
  ready: "Siap direview",
  analyzed: "Sudah dianalisis",
  approved: "Disetujui",
  rejected: "Ditolak",
  archived: "Diarsipkan",
  failed: "Gagal diproses",
};

export const LICENSE_LABEL: Record<LicenseStatus, string> = {
  unknown: "Izin belum jelas",
  internal: "Milik internal",
  creator_licensed: "Berlisensi dari kreator",
  testimonial_consented: "Testimoni dengan izin",
};

export const FUNNEL_LABEL: Record<AssetFunnel, string> = {
  A: "Funnel A: calon brand pemula",
  B: "Funnel B: owner brand existing",
  both: "Kedua funnel",
};

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  marketing: "Marketing",
  creator: "Kreator",
  ads_admin: "Admin Ads",
  sales: "Sales",
  viewer: "Viewer",
};

export const CAN_UPLOAD: Role[] = ["owner", "marketing", "creator"];
export const CAN_REVIEW: Role[] = ["owner", "marketing"];

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function formatDuration(s: string | null): string | null {
  if (s === null) return null;
  const total = Math.round(Number(s));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}
