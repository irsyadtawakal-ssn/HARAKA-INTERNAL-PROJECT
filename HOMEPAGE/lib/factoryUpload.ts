"use client";

import { factory, FactoryError } from "./factoryClient";
import type { AssetFunnel, AssetRecord, LicenseStatus } from "./assetLabels";

export const ACCEPTED_MIMES = ["video/mp4", "video/quicktime", "image/jpeg", "image/png", "image/webp"];

export interface UploadDefaults {
  funnel: AssetFunnel | null;
  license_status: LicenseStatus;
  creator_name: string;
}

type UploadTicket = { asset_id: string; upload_url: string; upload_headers: Record<string, string>; expires_in: number };

/** PUT langsung ke object storage lewat presigned URL; XHR dipakai karena fetch belum memberi progress upload. */
function putWithProgress(ticket: UploadTicket, file: File, onProgress: (ratio: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", ticket.upload_url);
    for (const [k, v] of Object.entries(ticket.upload_headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new FactoryError(xhr.status, `Storage menolak file (HTTP ${xhr.status}).`));
    xhr.onerror = () => reject(new FactoryError(0, "Koneksi ke storage terputus. Cek jaringan lalu unggah ulang."));
    xhr.send(file);
  });
}

export async function uploadAsset(file: File, defaults: UploadDefaults, onProgress: (ratio: number) => void): Promise<AssetRecord> {
  const ticket = await factory<UploadTicket>("assets/upload-url", {
    method: "POST",
    body: { filename: file.name, mime: file.type, size_bytes: file.size },
  });
  await putWithProgress(ticket, file, onProgress);
  return factory<AssetRecord>(`assets/${ticket.asset_id}/complete`, {
    method: "POST",
    body: {
      funnel: defaults.funnel,
      license_status: defaults.license_status,
      creator_name: defaults.creator_name.trim() || null,
    },
  });
}
