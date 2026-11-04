// Label aset Factory, disalin dari frontend/src/lib/labels.ts supaya teks di kedua dashboard sama.

export type AssetStatus = "uploading" | "processing" | "ready" | "analyzed" | "approved" | "rejected" | "archived" | "failed";
export type LicenseStatus = "unknown" | "internal" | "creator_licensed" | "testimonial_consented";
export type AssetFunnel = "A" | "B" | "both";

export type AssetRecord = {
  id: string;
  type: "video" | "photo";
  status: AssetStatus;
  original_filename: string;
  mime?: string;
  size_bytes?: number;
  duration_s?: string | null;
  creator_name?: string | null;
  license_status: LicenseStatus;
  funnel: AssetFunnel | null;
  notes?: string | null;
  error?: string | null;
  parent_asset_id: string | null;
  created_at?: string;
  thumbnail_url: string | null;
  original_url?: string | null;
};

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

/** Status aset yang boleh dipakai sebagai referensi konten (backend app/render.py REFERENCE_STATUSES). */
export const REFERENCE_STATUSES: AssetStatus[] = ["ready", "analyzed", "approved"];

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
