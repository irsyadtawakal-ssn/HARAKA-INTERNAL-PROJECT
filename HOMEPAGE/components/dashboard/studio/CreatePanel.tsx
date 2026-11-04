"use client";

import React, { useRef } from "react";
import { BadgePercent, Film, Image as ImageIcon, Megaphone, Upload, UserRound } from "lucide-react";
import dash from "@/app/dashboard/dashboard.module.css";
import { ACCEPTED_MIMES } from "@/lib/factoryUpload";
import { LICENSE_LABEL, type AssetRecord, type LicenseStatus } from "@/lib/assetLabels";
import { CONTENT_TYPES, type ContentType } from "@/lib/contentStudio";
import s from "./studio.module.css";

type Props = {
  references: AssetRecord[];
  processing: AssetRecord[];
  refId: string | null;
  onPickRef(id: string): void;
  type: ContentType;
  onType(t: ContentType): void;
  funnel: "A" | "B";
  onFunnel(f: "A" | "B"): void;
  license: LicenseStatus | "";
  onLicense(l: LicenseStatus): void;
  onUpload(file: File): void;
  uploadProgress: number | null;
  uploadError: string | null;
  formError: string | null;
  submitting: boolean;
  flowOffline: boolean;
  onGenerate(): void;
};

const TYPE_ICON: Record<ContentType, React.ReactNode> = {
  video_ads: <Megaphone size={16} aria-hidden />,
  talking_head: <UserRound size={16} aria-hidden />,
  hard_sell: <BadgePercent size={16} aria-hidden />,
};

function Thumb({ asset }: { asset: AssetRecord }) {
  if (asset.thumbnail_url) {
    // eslint-disable-next-line @next/next/no-img-element -- presigned URL storage, bukan aset statis Next
    return <img src={asset.thumbnail_url} alt="" />;
  }
  return asset.type === "photo" ? <ImageIcon size={20} aria-hidden /> : <Film size={20} aria-hidden />;
}

export default function CreatePanel(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const selected = p.references.find((a) => a.id === p.refId);
  const typeInfo = CONTENT_TYPES.find((t) => t.value === p.type) ?? CONTENT_TYPES[0];
  const uploading = p.uploadProgress !== null;

  return (
    <aside className={s.side} aria-label="Buat konten">
      <h3 className={s.sectionTitle}>Buat konten</h3>

      <div>
        <span className={s.stepLabel}>1. Foto atau video referensi</span>
        <div className={s.refGrid}>
          {p.references.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`${s.refTile} ${a.id === p.refId ? s.refTileActive : ""}`}
              aria-pressed={a.id === p.refId}
              onClick={() => p.onPickRef(a.id)}
            >
              <div className={s.refThumb}>
                <Thumb asset={a} />
              </div>
              <div className={s.refName}>{a.original_filename}</div>
              <div className={s.refMeta}>{LICENSE_LABEL[a.license_status]}</div>
            </button>
          ))}
          {p.processing.map((a) => (
            <button key={a.id} type="button" className={s.refTile} disabled>
              <div className={s.refThumb}>
                <Thumb asset={a} />
              </div>
              <div className={s.refName}>{a.original_filename}</div>
              <div className={s.refMeta}>Diproses…</div>
            </button>
          ))}
          <label className={s.refUpload} style={{ cursor: uploading ? "wait" : "pointer" }}>
            <Upload size={16} aria-hidden />
            {uploading ? `Mengunggah ${Math.round((p.uploadProgress ?? 0) * 100)}%` : "Unggah"}
            <input
              ref={fileRef}
              type="file"
              hidden
              accept={ACCEPTED_MIMES.join(",")}
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) p.onUpload(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <select
          aria-label="Status izin aset baru"
          className={s.select}
          value={p.license}
          onChange={(e) => p.onLicense(e.target.value as LicenseStatus)}
        >
          <option value="">Status izin untuk unggahan baru…</option>
          {(Object.keys(LICENSE_LABEL) as LicenseStatus[]).map((k) => (
            <option key={k} value={k}>
              {LICENSE_LABEL[k]}
            </option>
          ))}
        </select>
        {p.uploadError && <div className={s.error} style={{ marginTop: 8 }}>{p.uploadError}</div>}
      </div>

      <div>
        <span className={s.stepLabel}>2. Tipe konten</span>
        <div className={s.typeCards}>
          {CONTENT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`${s.typeCard} ${t.value === p.type ? s.typeCardActive : ""}`}
              aria-pressed={t.value === p.type}
              onClick={() => p.onType(t.value)}
            >
              <span className={s.typeIcon}>{TYPE_ICON[t.value]}</span>
              <span>
                <span className={s.typeTitle}>
                  {t.label} · {t.hint}
                </span>
                <span className={s.typeSub}>{t.summary}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className={s.stepLabel}>3. Target</span>
        <div className={s.funnelCards}>
          {(["A", "B"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`${s.typeCard} ${f === p.funnel ? s.typeCardActive : ""}`}
              style={{ gridTemplateColumns: "minmax(0, 1fr)" }}
              aria-pressed={f === p.funnel}
              onClick={() => p.onFunnel(f)}
            >
              <span>
                <span className={s.typeTitle}>Funnel {f}</span>
                <span className={s.typeSub}>{f === "A" ? "Calon brand pemula" : "Owner brand existing"}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={s.summary}>
        <span>
          Hasil: <strong>3 video</strong> · memakai {typeInfo.clips} klip kuota
        </span>
        <span>{selected ? `Referensi: ${selected.original_filename}` : "Pilih referensi dulu."}</span>
        {p.flowOffline && <span className={s.summaryWarn}>Mesin Flow offline — klip akan antri.</span>}
      </div>

      {p.formError && <div className={s.error}>{p.formError}</div>}
      <button type="button" className={dash.btnPrimary} disabled={!p.refId || p.submitting} onClick={p.onGenerate}>
        Generate
      </button>
    </aside>
  );
}
