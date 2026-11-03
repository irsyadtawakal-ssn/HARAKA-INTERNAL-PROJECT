"use client";

import { ArrowLeft, Copy } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FunnelStamp, LicenseBadge, PIGMENT, StatusChip } from "@/components/asset-marks";
import { Field, inputClass } from "@/components/field";
import { useUser } from "@/components/user-context";
import { api, ApiError } from "@/lib/client";
import { CAN_REVIEW, CAN_UPLOAD, FUNNEL_LABEL, LICENSE_LABEL, formatBytes, formatDate, formatDuration } from "@/lib/labels";
import type { Asset, AssetFunnel, LicenseStatus } from "@/lib/types";

interface FormState {
  funnel: AssetFunnel | "";
  license_status: LicenseStatus;
  license_expires_at: string;
  creator_name: string;
  captured_at: string;
  notes: string;
}

const toForm = (a: Asset): FormState => ({
  funnel: a.funnel ?? "",
  license_status: a.license_status,
  license_expires_at: a.license_expires_at ?? "",
  creator_name: a.creator_name ?? "",
  captured_at: a.captured_at ?? "",
  notes: a.notes ?? "",
});

const CREATOR_EDITABLE = ["uploading", "processing", "ready", "analyzed", "failed"];

export function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useUser();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewNote, setReviewNote] = useState("");

  const apply = useCallback((a: Asset) => {
    setAsset(a);
    setForm(toForm(a));
  }, []);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stale = false;
    api<Asset>(`assets/${id}`).then(
      (a) => !stale && apply(a),
      (e: unknown) =>
        !stale &&
        setLoadError(e instanceof ApiError && e.status === 404 ? "Aset ini tidak ditemukan atau sudah dihapus." : "Aset gagal dimuat."),
    );
    return () => {
      stale = true;
    };
  }, [id, apply, tick]);

  // Masih diproses worker: muat ulang sampai selesai.
  useEffect(() => {
    if (asset?.status !== "processing") return;
    const t = setInterval(() => setTick((n) => n + 1), 2500);
    return () => clearInterval(t);
  }, [asset?.status]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl">
        <BackLink />
        <p className="mt-6 rounded-lg bg-danger-wash px-4 py-3 text-pigment-failed">{loadError}</p>
      </div>
    );
  }
  if (!asset || !form) return <p className="text-ink-soft">Memuat aset…</p>;

  const canReview = CAN_REVIEW.includes(user.role);
  const canEdit =
    canReview ||
    (CAN_UPLOAD.includes(user.role) && asset.uploaded_by_id === user.id && CREATOR_EDITABLE.includes(asset.status));
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(asset));
  const licenseChanged = form.license_status !== asset.license_status || form.license_expires_at !== (asset.license_expires_at ?? "");

  async function run(action: () => Promise<Asset>, okText: string) {
    setBusy(true);
    setMessage(null);
    try {
      apply(await action());
      setMessage({ kind: "ok", text: okText });
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof ApiError ? e.message : "Perubahan gagal disimpan." });
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(
      () =>
        api<Asset>(`assets/${id}`, {
          method: "PATCH",
          body: {
            funnel: form.funnel || null,
            license_status: form.license_status,
            license_expires_at: form.license_expires_at || null,
            creator_name: form.creator_name.trim() || null,
            captured_at: form.captured_at || null,
            notes: form.notes.trim() || null,
          },
        }),
      asset.status === "approved" && licenseChanged
        ? "Perubahan disimpan. Izin pakai berubah, jadi aset perlu disetujui ulang."
        : "Perubahan disimpan.",
    );

  const review = (action: "approve" | "reject" | "archive", okText: string) =>
    run(() => api<Asset>(`assets/${id}/review`, { method: "POST", body: { action, note: reviewNote.trim() || null } }), okText);

  // Alasan tombol Setujui tidak aktif, ditampilkan apa adanya supaya reviewer tahu langkah berikutnya.
  const expired = asset.license_expires_at !== null && asset.license_expires_at < new Date().toISOString().slice(0, 10);
  const approveBlocker =
    asset.status === "processing" ? "Tunggu sampai aset selesai diproses."
    : asset.status === "failed" ? "File gagal diproses. Unggah ulang file yang benar."
    : asset.license_status === "unknown" ? "Isi izin pakai dan simpan dulu sebelum menyetujui."
    : expired ? "Izin pakai sudah kedaluwarsa. Perbarui tanggalnya dulu."
    : asset.status === "approved" ? "Aset ini sudah disetujui."
    : dirty ? "Simpan perubahan dulu sebelum menyetujui."
    : null;

  return (
    <div className="mx-auto max-w-[1200px]">
      <BackLink />

      <header className="mt-4 mb-6 flex items-start gap-4">
        <FunnelStamp funnel={asset.funnel} size="lg" />
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight break-words">{asset.original_filename}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <StatusChip status={asset.status} />
            <LicenseBadge license={asset.license_status} />
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-xl border border-line bg-ink">
            <span className={`absolute inset-y-0 left-0 z-10 w-1.5 ${PIGMENT[asset.status]}`} aria-hidden />
            {asset.status === "processing" ? (
              <div className="grid aspect-video place-items-center text-white/80">Menyiapkan pratinjau…</div>
            ) : asset.type === "video" && asset.original_url ? (
              <video src={asset.original_url} poster={asset.thumbnail_url ?? undefined} controls preload="metadata" className="aspect-video w-full bg-ink" />
            ) : asset.original_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.original_url} alt={asset.original_filename} className="max-h-[70vh] w-full bg-ink object-contain" />
            ) : null}
          </div>

          {asset.error && (
            <p className="rounded-lg bg-danger-wash px-4 py-3 text-sm text-pigment-failed">{asset.error}</p>
          )}
          {asset.duplicate_of_id && (
            <p className="rounded-lg bg-amber-wash px-4 py-3 text-sm text-ink">
              <Copy className="mr-1.5 inline size-4 text-pigment-processing" aria-hidden />
              File ini sama persis dengan aset yang sudah ada.{" "}
              <Link href={`/aset/${asset.duplicate_of_id}`} className="font-medium text-berry underline underline-offset-2 hover:text-berry-deep">
                Buka aset asli
              </Link>
            </p>
          )}

          <section>
            <h2 className="mb-3 font-semibold">Info file</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-line bg-surface p-5 text-sm sm:grid-cols-3">
              <Info label="Tipe" value={asset.type === "video" ? "Video" : "Foto"} />
              {asset.type === "video" && <Info label="Durasi" value={formatDuration(asset.duration_s) ?? "-"} />}
              <Info label="Resolusi" value={asset.width && asset.height ? `${asset.width}×${asset.height}` : "-"} />
              <Info label="Ukuran" value={formatBytes(asset.size_bytes)} />
              <Info label="Versi" value={asset.parent_asset_id ? `v${asset.version} dari aset induk` : `v${asset.version}`} />
              <Info label="Diunggah" value={formatDate(asset.created_at)} />
              <div className="col-span-full">
                <dt className="text-ink-soft">Checksum SHA-256</dt>
                <dd className="mt-0.5 font-medium break-all text-ink">{asset.checksum_sha256 ?? "-"}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-4 font-semibold">Data aset</h2>
            <fieldset disabled={!canEdit || busy} className="space-y-4">
              <Field label="Funnel">
                <select className={inputClass} value={form.funnel} onChange={(e) => setForm({ ...form, funnel: e.target.value as FormState["funnel"] })}>
                  <option value="">Belum ditentukan</option>
                  {(Object.keys(FUNNEL_LABEL) as AssetFunnel[]).map((f) => (
                    <option key={f} value={f}>{FUNNEL_LABEL[f]}</option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Izin pakai">
                  <select className={inputClass} value={form.license_status} onChange={(e) => setForm({ ...form, license_status: e.target.value as LicenseStatus })}>
                    {(Object.keys(LICENSE_LABEL) as LicenseStatus[]).map((l) => (
                      <option key={l} value={l}>{LICENSE_LABEL[l]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Izin berlaku sampai" hint="Kosongkan bila tanpa batas.">
                  <input type="date" className={inputClass} value={form.license_expires_at} onChange={(e) => setForm({ ...form, license_expires_at: e.target.value })} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kreator / sumber">
                  <input className={inputClass} maxLength={120} value={form.creator_name} onChange={(e) => setForm({ ...form, creator_name: e.target.value })} />
                </Field>
                <Field label="Tanggal pengambilan">
                  <input type="date" className={inputClass} value={form.captured_at} onChange={(e) => setForm({ ...form, captured_at: e.target.value })} />
                </Field>
              </div>
              <Field label="Catatan">
                <textarea rows={3} className={inputClass} maxLength={2000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
              {canEdit && (
                <button
                  type="button"
                  onClick={save}
                  disabled={!dirty || busy}
                  className="rounded-lg border border-ink bg-surface px-4 py-2 font-semibold text-ink transition-colors hover:bg-well disabled:border-line disabled:text-ink-faint disabled:hover:bg-surface"
                >
                  Simpan perubahan
                </button>
              )}
            </fieldset>
            {!canEdit && <p className="mt-3 text-sm text-ink-soft">Peran Anda hanya bisa melihat data aset ini.</p>}
          </section>

          {canReview && (
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="font-semibold">Review</h2>
              <p className="mb-4 text-sm text-ink-soft">Aset yang disetujui boleh dipakai untuk landing page dan draft iklan.</p>
              <Field label="Catatan review (opsional)">
                <textarea rows={2} className={inputClass} maxLength={2000} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} disabled={busy} />
              </Field>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => review("approve", "Aset disetujui.")}
                  disabled={busy || approveBlocker !== null}
                  className="rounded-lg bg-berry px-4 py-2 font-semibold text-white transition-colors hover:bg-berry-deep disabled:bg-well disabled:text-ink-faint"
                >
                  Setujui
                </button>
                <button
                  type="button"
                  onClick={() => review("reject", "Aset ditolak.")}
                  disabled={busy || asset.status === "processing" || asset.status === "rejected"}
                  className="rounded-lg border border-line px-4 py-2 font-semibold text-pigment-rejected transition-colors hover:bg-danger-wash disabled:text-ink-faint disabled:hover:bg-transparent"
                >
                  Tolak
                </button>
                <button
                  type="button"
                  onClick={() => review("archive", "Aset diarsipkan.")}
                  disabled={busy || asset.status === "archived"}
                  className="rounded-lg px-4 py-2 font-medium text-ink-soft transition-colors hover:bg-well hover:text-ink disabled:text-ink-faint disabled:hover:bg-transparent"
                >
                  Arsipkan
                </button>
              </div>
              {approveBlocker && asset.status !== "approved" && <p className="mt-3 text-sm text-ink-soft">{approveBlocker}</p>}
            </section>
          )}

          {message && (
            <p
              role={message.kind === "error" ? "alert" : "status"}
              className={`rounded-lg px-4 py-3 text-sm ${message.kind === "ok" ? "bg-pigment-approved/10 text-pigment-approved" : "bg-danger-wash text-pigment-failed"}`}
            >
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/aset" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden />
      Kembali ke galeri
    </Link>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-soft">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}
