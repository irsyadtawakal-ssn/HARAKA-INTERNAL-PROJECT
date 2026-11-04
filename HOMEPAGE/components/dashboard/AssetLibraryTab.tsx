"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Film, Image as ImageIcon, Upload, X } from "lucide-react";
import styles from "@/app/dashboard/dashboard.module.css";
import { factory, FactoryError } from "@/lib/factoryClient";
import { ACCEPTED_MIMES, uploadAsset } from "@/lib/factoryUpload";
import {
  FUNNEL_LABEL,
  LICENSE_LABEL,
  STATUS_LABEL,
  formatBytes,
  type AssetFunnel,
  type AssetRecord,
  type LicenseStatus,
} from "@/lib/assetLabels";

const PAGE = 24;

const message = (e: unknown) => (e instanceof FactoryError ? e.message : "Terjadi galat. Coba lagi.");

const chip = (active: boolean): React.CSSProperties => ({
  border: `1px solid ${active ? "#0d6a55" : "#e2d6d6"}`,
  background: active ? "#eaf5f1" : "#fff",
  color: active ? "#0d6a55" : "#4a3b3b",
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
});
const field: React.CSSProperties = { width: "100%", border: "1px solid #e2d6d6", borderRadius: 8, padding: "7px 9px", fontSize: 12.5 };
const label: React.CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 700, color: "#5c4b4b", margin: "10px 0 4px" };
const errorBox: React.CSSProperties = { background: "#fdecec", color: "#a12a2a", borderRadius: 8, padding: "8px 10px", fontSize: 12.5 };

type Filters = { type: "" | "photo" | "video"; funnel: "" | AssetFunnel; license_status: "" | LicenseStatus };

function query(f: Filters, offset: number): string {
  const p = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
  if (f.type) p.set("type", f.type);
  if (f.funnel) p.set("funnel", f.funnel);
  if (f.license_status) p.set("license_status", f.license_status);
  return `assets?${p}`;
}

export default function AssetLibraryTab() {
  const [filters, setFilters] = useState<Filters>({ type: "", funnel: "", license_status: "" });
  const [items, setItems] = useState<AssetRecord[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploadLicense, setUploadLicense] = useState<LicenseStatus | "">("");
  const [uploadFunnel, setUploadFunnel] = useState<AssetFunnel | "">("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [detail, setDetail] = useState<AssetRecord | null>(null);
  const [draft, setDraft] = useState({ license_status: "unknown" as LicenseStatus, funnel: "" as AssetFunnel | "", creator_name: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async (f: Filters, offset: number) => {
    try {
      const page = await factory<{ items: AssetRecord[]; total: number }>(query(f, offset));
      setItems((prev) => (offset ? [...prev, ...page.items] : page.items));
      setTotal(page.total);
      setError(null);
    } catch (e) {
      setError(message(e));
    }
  }, []);

  useEffect(() => {
    load(filters, 0);
  }, [filters, load]);

  async function open(a: AssetRecord) {
    setDetailError(null);
    setDetail(a);
    setDraft({ license_status: a.license_status, funnel: a.funnel ?? "", creator_name: a.creator_name ?? "", notes: a.notes ?? "" });
    try {
      setDetail(await factory<AssetRecord>(`assets/${a.id}`));
    } catch (e) {
      setDetailError(message(e));
    }
  }

  async function save() {
    if (!detail) return;
    setSaving(true);
    setDetailError(null);
    try {
      const updated = await factory<AssetRecord>(`assets/${detail.id}`, {
        method: "PATCH",
        body: {
          license_status: draft.license_status,
          funnel: draft.funnel || null,
          creator_name: draft.creator_name.trim() || null,
          notes: draft.notes.trim() || null,
        },
      });
      setDetail((d) => ({ ...updated, original_url: d?.original_url }));
      setItems((list) => list.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
    } catch (e) {
      setDetailError(message(e));
    } finally {
      setSaving(false);
    }
  }

  async function onFiles(files: FileList) {
    if (!uploadLicense) {
      setUploadError("Pilih status izin dulu sebelum mengunggah.");
      return;
    }
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        setUploading(`${file.name} 0%`);
        await uploadAsset(file, { funnel: uploadFunnel || null, license_status: uploadLicense, creator_name: "" }, (r) =>
          setUploading(`${file.name} ${Math.round(r * 100)}%`),
        );
      }
      await load(filters, 0);
    } catch (e) {
      setUploadError(message(e));
    } finally {
      setUploading(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <div>
          <h3 className={styles.panelTitle}>Asset Library</h3>
          <p className={styles.panelDesc}>Foto dan video pabrik, produk, dan kreator. Klip hasil render Flow tersimpan di sini sebagai turunan referensinya.</p>
        </div>
        {total !== null && <span className={styles.badgeSuccess}>{total} aset</span>}
      </div>

      <div
        style={{ border: "1px dashed #d9c9c9", borderRadius: 12, padding: 14, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
        }}
      >
        <select aria-label="Status izin unggahan" value={uploadLicense} onChange={(e) => setUploadLicense(e.target.value as LicenseStatus)} style={{ ...field, width: "auto" }}>
          <option value="">Status izin…</option>
          {(Object.keys(LICENSE_LABEL) as LicenseStatus[]).map((k) => (
            <option key={k} value={k}>
              {LICENSE_LABEL[k]}
            </option>
          ))}
        </select>
        <select aria-label="Funnel unggahan" value={uploadFunnel} onChange={(e) => setUploadFunnel(e.target.value as AssetFunnel)} style={{ ...field, width: "auto" }}>
          <option value="">Funnel (opsional)</option>
          {(Object.keys(FUNNEL_LABEL) as AssetFunnel[]).map((k) => (
            <option key={k} value={k}>
              {FUNNEL_LABEL[k]}
            </option>
          ))}
        </select>
        <label className={styles.btnSecondary} style={{ cursor: uploading ? "wait" : "pointer" }}>
          <Upload size={14} /> {uploading ? `Mengunggah ${uploading}` : "Unggah file"}
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            accept={ACCEPTED_MIMES.join(",")}
            disabled={Boolean(uploading)}
            onChange={(e) => e.target.files?.length && onFiles(e.target.files)}
          />
        </label>
        <span style={{ fontSize: 11.5, color: "#7a6a6a" }}>atau tarik file ke kotak ini. Foto maks 25 MB, video maks 2 GB.</span>
        {uploadError && <div style={{ ...errorBox, width: "100%" }}>{uploadError}</div>}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {([
          ["", "Semua"],
          ["photo", "Foto"],
          ["video", "Video"],
        ] as const).map(([v, text]) => (
          <button key={text} type="button" style={chip(filters.type === v)} aria-pressed={filters.type === v} onClick={() => setFilter("type", v)}>
            {text}
          </button>
        ))}
        <select aria-label="Filter funnel" value={filters.funnel} onChange={(e) => setFilter("funnel", e.target.value as AssetFunnel)} style={{ ...field, width: "auto" }}>
          <option value="">Semua funnel</option>
          {(Object.keys(FUNNEL_LABEL) as AssetFunnel[]).map((k) => (
            <option key={k} value={k}>
              {FUNNEL_LABEL[k]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter lisensi"
          value={filters.license_status}
          onChange={(e) => setFilter("license_status", e.target.value as LicenseStatus)}
          style={{ ...field, width: "auto" }}
        >
          <option value="">Semua lisensi</option>
          {(Object.keys(LICENSE_LABEL) as LicenseStatus[]).map((k) => (
            <option key={k} value={k}>
              {LICENSE_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      {error && <div style={{ ...errorBox, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {items.map((a) => (
          <button
            key={a.id}
            type="button"
            data-testid="asset-card"
            onClick={() => open(a)}
            style={{ border: "1px solid #eadfdf", borderRadius: 12, background: "#fff", padding: 0, textAlign: "left", cursor: "pointer", overflow: "hidden" }}
          >
            <div style={{ aspectRatio: "4 / 5", background: "#f4eeee", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {a.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- presigned URL storage, bukan aset statis Next
                <img src={a.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : a.type === "photo" ? (
                <ImageIcon size={28} color="#b9a5a5" />
              ) : (
                <Film size={28} color="#b9a5a5" />
              )}
            </div>
            <div style={{ padding: "8px 10px", fontSize: 12 }}>
              <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.original_filename}</div>
              <div style={{ color: "#7a6a6a" }}>
                {STATUS_LABEL[a.status] ?? a.status}
                {a.parent_asset_id ? " · hasil render" : ""}
              </div>
              {a.license_status === "unknown" && <span className={styles.badgeWarning}>Lisensi belum jelas</span>}
            </div>
          </button>
        ))}
      </div>
      {total !== null && items.length < total && (
        <button type="button" className={styles.btnSecondary} style={{ marginTop: 14 }} onClick={() => load(filters, items.length)}>
          Muat lebih banyak
        </button>
      )}
      {total === 0 && !error && <p style={{ fontSize: 12.5, color: "#7a6a6a" }}>Belum ada aset untuk filter ini.</p>}

      {detail && (
        <div
          role="dialog"
          aria-label={`Detail ${detail.original_filename}`}
          style={{ position: "fixed", inset: 0, background: "rgba(20,10,10,0.45)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}
          onClick={() => setDetail(null)}
        >
          <div style={{ width: "min(420px, 100%)", height: "100%", background: "#fff", padding: 18, overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 14, wordBreak: "break-all" }}>{detail.original_filename}</strong>
              <button type="button" aria-label="Tutup" onClick={() => setDetail(null)} style={{ border: 0, background: "transparent", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: "#7a6a6a", margin: "4px 0 10px" }}>
              {STATUS_LABEL[detail.status] ?? detail.status}
              {detail.size_bytes ? ` · ${formatBytes(detail.size_bytes)}` : ""}
              {detail.parent_asset_id ? " · hasil render dari referensi" : ""}
            </p>
            {detail.original_url &&
              (detail.type === "video" ? (
                <video src={detail.original_url} controls playsInline style={{ width: "100%", borderRadius: 10, background: "#111" }} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- presigned URL storage
                <img src={detail.original_url} alt={detail.original_filename} style={{ width: "100%", borderRadius: 10 }} />
              ))}
            {detail.error && <div style={{ ...errorBox, marginTop: 10 }}>{detail.error}</div>}

            <label style={label} htmlFor="asset-license">
              Status izin
            </label>
            <select
              id="asset-license"
              value={draft.license_status}
              onChange={(e) => setDraft((d) => ({ ...d, license_status: e.target.value as LicenseStatus }))}
              style={field}
            >
              {(Object.keys(LICENSE_LABEL) as LicenseStatus[]).map((k) => (
                <option key={k} value={k}>
                  {LICENSE_LABEL[k]}
                </option>
              ))}
            </select>
            <label style={label} htmlFor="asset-funnel">
              Funnel
            </label>
            <select id="asset-funnel" value={draft.funnel} onChange={(e) => setDraft((d) => ({ ...d, funnel: e.target.value as AssetFunnel }))} style={field}>
              <option value="">Belum ditentukan</option>
              {(Object.keys(FUNNEL_LABEL) as AssetFunnel[]).map((k) => (
                <option key={k} value={k}>
                  {FUNNEL_LABEL[k]}
                </option>
              ))}
            </select>
            <label style={label} htmlFor="asset-creator">
              Nama kreator
            </label>
            <input id="asset-creator" value={draft.creator_name} onChange={(e) => setDraft((d) => ({ ...d, creator_name: e.target.value }))} style={field} />
            <label style={label} htmlFor="asset-notes">
              Catatan
            </label>
            <textarea id="asset-notes" value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} style={{ ...field, minHeight: 70 }} />
            {detailError && <div style={{ ...errorBox, marginTop: 10 }}>{detailError}</div>}
            <button type="button" className={styles.btnPrimary} style={{ marginTop: 14 }} disabled={saving} onClick={save}>
              Simpan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
