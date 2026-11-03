// Padanan schema FastAPI (backend/app/schemas.py).

export type Role = "owner" | "marketing" | "creator" | "ads_admin" | "sales" | "viewer";
export type AssetFunnel = "A" | "B" | "both";
export type LicenseStatus = "unknown" | "internal" | "creator_licensed" | "testimonial_consented";
export type AssetStatus = "uploading" | "processing" | "ready" | "analyzed" | "approved" | "rejected" | "archived" | "failed";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  is_active: boolean;
  last_login_at: string | null;
}

export interface Asset {
  id: string;
  type: "video" | "photo";
  status: AssetStatus;
  original_filename: string;
  mime: string;
  size_bytes: number;
  checksum_sha256: string | null;
  duplicate_of_id: string | null;
  duration_s: string | null;
  width: number | null;
  height: number | null;
  creator_name: string | null;
  captured_at: string | null;
  uploaded_by_id: string;
  license_status: LicenseStatus;
  license_expires_at: string | null;
  parent_asset_id: string | null;
  version: number;
  funnel: AssetFunnel | null;
  notes: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  thumbnail_url: string | null;
  original_url: string | null;
}

export interface AssetPage {
  items: Asset[];
  total: number;
}

export interface UploadTicket {
  asset_id: string;
  upload_url: string;
  upload_headers: Record<string, string>;
  expires_in: number;
}
