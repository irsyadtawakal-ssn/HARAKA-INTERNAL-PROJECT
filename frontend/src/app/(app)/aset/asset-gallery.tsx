"use client";

import { Upload } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AssetCard } from "@/components/asset-card";
import { filterSelectClass } from "@/components/field";
import { Segmented } from "@/components/segmented";
import { UploadPanel } from "@/components/upload-panel";
import { useUser } from "@/components/user-context";
import { api, ApiError } from "@/lib/client";
import { CAN_UPLOAD, LICENSE_LABEL, STATUS_LABEL } from "@/lib/labels";
import type { AssetPage, AssetStatus, LicenseStatus } from "@/lib/types";

const POLL_MS = 2500;
const FILTER_KEYS = ["funnel", "type", "status", "license_status"] as const;
const STATUS_FILTERS: AssetStatus[] = ["processing", "ready", "analyzed", "approved", "rejected", "failed", "archived"];

export function AssetGallery() {
  const user = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [page, setPage] = useState<AssetPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const canUpload = CAN_UPLOAD.includes(user.role);

  const query = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = params.get(k);
    if (v) query.set(k, v);
  }
  const queryString = query.toString();
  const filtered = queryString.length > 0;

  // Naik tiap kali galeri perlu dimuat ulang (upload selesai, polling).
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let stale = false; // respons filter lama tidak boleh menimpa respons filter baru
    api<AssetPage>(`assets?limit=200${queryString ? `&${queryString}` : ""}`).then(
      (p) => {
        if (stale) return;
        setPage(p);
        setError(null);
      },
      (e: unknown) => !stale && setError(e instanceof ApiError ? e.message : "Galeri gagal dimuat."),
    );
    return () => {
      stale = true;
    };
  }, [queryString, tick]);

  // Selama ada aset yang masih diproses worker, galeri menyegarkan diri sampai semuanya selesai.
  const processing = page?.items.filter((a) => a.status === "processing").length ?? 0;
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(reload, POLL_MS);
    return () => clearInterval(t);
  }, [processing, reload]);

  function setFilter(key: (typeof FILTER_KEYS)[number], value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Aset</h1>
          <p className="mt-1 text-ink-soft">
            {page === null
              ? "Memuat galeriâ€¦"
              : `${page.total} aset${processing ? `, ${processing} sedang diproses` : ""}`}
          </p>
        </div>
        {canUpload && !uploadOpen && (
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-berry px-4 py-2.5 font-semibold text-white transition-colors hover:bg-berry-deep"
          >
            <Upload className="size-[18px]" aria-hidden />
            Unggah aset
          </button>
        )}
      </header>

      {canUpload && <UploadPanel open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={reload} />}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented
          label="Funnel"
          value={params.get("funnel") ?? ""}
          onChange={(v) => setFilter("funnel", v)}
          options={[
            { value: "", label: "Semua funnel" },
            { value: "A", label: "Funnel A" },
            { value: "B", label: "Funnel B" },
          ]}
        />
        <Segmented
          label="Tipe"
          value={params.get("type") ?? ""}
          onChange={(v) => setFilter("type", v)}
          options={[
            { value: "", label: "Semua tipe" },
            { value: "video", label: "Video" },
            { value: "photo", label: "Foto" },
          ]}
        />
        <select
          aria-label="Status"
          className={filterSelectClass}
          value={params.get("status") ?? ""}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="">Semua status</option>
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select
          aria-label="Izin pakai"
          className={filterSelectClass}
          value={params.get("license_status") ?? ""}
          onChange={(e) => setFilter("license_status", e.target.value)}
        >
          <option value="">Semua izin</option>
          {(Object.keys(LICENSE_LABEL) as LicenseStatus[]).map((l) => (
            <option key={l} value={l}>{LICENSE_LABEL[l]}</option>
          ))}
        </select>
        {filtered && (
          <button type="button" onClick={() => router.replace(pathname)} className="text-sm font-medium text-berry hover:text-berry-deep">
            Hapus filter
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-5 rounded-lg bg-danger-wash px-4 py-3 text-pigment-failed">
          {error}
        </p>
      )}

      {page && page.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          {filtered ? (
            <>
              <p className="font-semibold">Tidak ada aset yang cocok dengan filter ini.</p>
              <p className="mt-1 text-ink-soft">Ubah atau hapus filter untuk melihat aset lain.</p>
            </>
          ) : (
            <>
              <p className="font-semibold">Galeri masih kosong.</p>
              <p className="mt-1 text-ink-soft">
                {canUpload
                  ? "Unggah footage pabrik, foto produk, atau video kreator untuk mulai menyusun campaign."
                  : "Aset akan muncul di sini setelah tim marketing atau kreator mengunggahnya."}
              </p>
              {canUpload && !uploadOpen && (
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-berry px-4 py-2.5 font-semibold text-white hover:bg-berry-deep"
                >
                  <Upload className="size-[18px]" aria-hidden />
                  Unggah aset
                </button>
              )}
            </>
          )}
        </div>
      )}

      {page && page.items.length > 0 && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {page.items.map((a) => (
            <li key={a.id} className="flex">
              <div className="w-full [&>a]:h-full">
                <AssetCard asset={a} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
