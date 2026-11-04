"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Film, Image as ImageIcon, RefreshCw, Sparkles, Upload, X } from "lucide-react";
import styles from "@/app/dashboard/dashboard.module.css";
import { factory, FactoryError } from "@/lib/factoryClient";
import { ACCEPTED_MIMES, uploadAsset } from "@/lib/factoryUpload";
import { LICENSE_LABEL, REFERENCE_STATUSES, type AssetRecord, type LicenseStatus } from "@/lib/assetLabels";
import {
  CLIP_STATUS_LABELS,
  CONTENT_TYPES,
  isClaimPending,
  isJobActive,
  jobStageLabel,
  slotLabel,
  type ContentJob,
  type ContentType,
  type Quota,
  type RenderJob,
  type Script,
} from "@/lib/contentStudio";

const POLL_MS = 5000;

const message = (e: unknown) => (e instanceof FactoryError ? e.message : "Terjadi galat. Coba lagi.");

const TYPE_LABEL = Object.fromEntries(CONTENT_TYPES.map((t) => [t.value, t.label])) as Record<ContentType, string>;

const card: React.CSSProperties = { border: "1px solid #eadfdf", borderRadius: 12, padding: 16, background: "#fff" };
const label: React.CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 700, color: "#5c4b4b", marginBottom: 6 };
const chip = (active: boolean): React.CSSProperties => ({
  border: `1px solid ${active ? "#0d6a55" : "#e2d6d6"}`,
  background: active ? "#eaf5f1" : "#fff",
  color: active ? "#0d6a55" : "#4a3b3b",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "left",
});
const errorBox: React.CSSProperties = { background: "#fdecec", color: "#a12a2a", borderRadius: 8, padding: "8px 10px", fontSize: 12.5 };

export default function ContentStudioTab() {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [jobs, setJobs] = useState<ContentJob[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [refId, setRefId] = useState<string | null>(null);
  const [type, setType] = useState<ContentType>("video_ads");
  const [funnel, setFunnel] = useState<"A" | "B">("A");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [license, setLicense] = useState<LicenseStatus | "">("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [scripts, setScripts] = useState<Record<string, Script>>({});
  const [clipUrls, setClipUrls] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [jobErrors, setJobErrors] = useState<Record<string, string>>({});

  const loadQuota = useCallback(() => factory<Quota>("render-jobs/quota").then(setQuota), []);
  const loadJobs = useCallback(() => factory<ContentJob[]>("content-jobs").then(setJobs), []);
  const loadAssets = useCallback(
    () => factory<{ items: AssetRecord[] }>("assets?limit=60").then((p) => setAssets(p.items)),
    [],
  );

  useEffect(() => {
    Promise.all([loadQuota(), loadJobs(), loadAssets()]).catch((e) => setLoadError(message(e)));
  }, [loadQuota, loadJobs, loadAssets]);

  // Perbarui progres hanya selama ada job yang masih berjalan dan tab ini terlihat.
  const active = jobs.some(isJobActive);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadJobs().catch(() => {});
      loadQuota().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(t);
  }, [active, loadJobs, loadQuota]);

  // Aset baru diunggah masih diproses worker; muat ulang sampai siap dipakai sebagai referensi.
  useEffect(() => {
    if (!processingIds.length) return;
    const t = setInterval(() => loadAssets().catch(() => {}), POLL_MS);
    return () => clearInterval(t);
  }, [processingIds, loadAssets]);
  useEffect(() => {
    setProcessingIds((ids) => {
      const left = ids.filter((id) => !assets.some((a) => a.id === id && a.status !== "processing"));
      return left.length === ids.length ? ids : left;
    });
  }, [assets]);

  // Script dan URL video diambil sekali per id.
  useEffect(() => {
    for (const job of jobs) {
      const sid = job.script_id;
      if (sid && !requested.current.has(`s:${sid}`)) {
        requested.current.add(`s:${sid}`);
        factory<Script>(`scripts/${sid}`)
          .then((s) => setScripts((m) => ({ ...m, [sid]: s })))
          .catch(() => requested.current.delete(`s:${sid}`));
      }
      for (const clip of job.render_jobs) {
        const aid = clip.result_asset_id;
        if (clip.status === "done" && aid && !requested.current.has(`a:${aid}`)) {
          requested.current.add(`a:${aid}`);
          factory<AssetRecord>(`assets/${aid}`)
            .then((a) => a.original_url && setClipUrls((m) => ({ ...m, [aid]: a.original_url as string })))
            .catch(() => requested.current.delete(`a:${aid}`));
        }
      }
    }
  }, [jobs]);

  const references = assets.filter((a) => REFERENCE_STATUSES.includes(a.status));
  const processing = assets.filter((a) => processingIds.includes(a.id));

  async function generate() {
    if (!refId || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      const job = await factory<ContentJob>("content-jobs", { method: "POST", body: { type, funnel, reference_asset_id: refId } });
      setJobs((list) => [job, ...list.filter((j) => j.id !== job.id)]);
      loadQuota().catch(() => {});
    } catch (e) {
      setFormError(message(e));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function onUpload(file: File) {
    if (!license) {
      setUploadError("Pilih status izin dulu sebelum mengunggah.");
      return;
    }
    setUploadError(null);
    setUploadProgress(0);
    try {
      const asset = await uploadAsset(file, { funnel, license_status: license, creator_name: "" }, setUploadProgress);
      setProcessingIds((ids) => [...ids, asset.id]);
      setRefId(asset.id);
      await loadAssets();
    } catch (e) {
      setUploadError(message(e));
    } finally {
      setUploadProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function act(key: string, jobId: string, run: () => Promise<unknown>) {
    setBusy((b) => ({ ...b, [key]: true }));
    setJobErrors((m) => ({ ...m, [jobId]: "" }));
    try {
      await run();
      await loadJobs();
      loadQuota().catch(() => {});
    } catch (e) {
      setJobErrors((m) => ({ ...m, [jobId]: message(e) }));
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  }

  const decide = (job: ContentJob, decision: "approve" | "reject") =>
    act(`claim:${job.id}`, job.id, () =>
      factory(`content-jobs/${job.id}/claim-decision`, {
        method: "POST",
        body: { decision, note: notes[job.id]?.trim() || null },
      }),
    );
  const retryJob = (job: ContentJob) => act(`job:${job.id}`, job.id, () => factory(`content-jobs/${job.id}/retry`, { method: "POST" }));
  const retryClip = (job: ContentJob, clip: RenderJob) =>
    act(`clip:${clip.id}`, job.id, () => factory(`render-jobs/${clip.id}/retry`, { method: "POST" }));

  const selected = assets.find((a) => a.id === refId) ?? null;

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <div>
          <h3 className={styles.panelTitle}>Pembuatan Konten AI</h3>
          <p className={styles.panelDesc}>
            Pilih referensi foto atau video, pilih tipe konten, lalu Generate. AI menulis 3 hook, Google Flow merender klipnya.
          </p>
        </div>
        {quota && (
          <span className={quota.remaining > 0 ? styles.badgeSuccess : styles.badgeWarning}>
            Sisa {quota.remaining} dari {quota.limit} klip hari ini
          </span>
        )}
      </div>

      {loadError && <div style={{ ...errorBox, marginBottom: 12 }}>{loadError}</div>}

      <div style={{ ...card, display: "grid", gap: 16, marginBottom: 20 }}>
        <div>
          <span style={label}>1. Referensi</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {references.map((a) => (
              <button key={a.id} type="button" style={chip(a.id === refId)} onClick={() => setRefId(a.id)} aria-pressed={a.id === refId}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {a.type === "photo" ? <ImageIcon size={14} /> : <Film size={14} />}
                  {a.original_filename}
                </span>
                <span style={{ display: "block", fontSize: 11, fontWeight: 500, opacity: 0.8 }}>{LICENSE_LABEL[a.license_status]}</span>
              </button>
            ))}
            {!references.length && <span style={{ fontSize: 12.5, color: "#7a6a6a" }}>Belum ada aset siap. Unggah foto atau video di bawah.</span>}
          </div>
          {processing.map((a) => (
            <p key={a.id} style={{ fontSize: 12, color: "#7a6a6a", margin: "8px 0 0" }}>
              {a.original_filename} sedang diproses…
            </p>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 }}>
            <select
              aria-label="Status izin aset baru"
              value={license}
              onChange={(e) => setLicense(e.target.value as LicenseStatus)}
              style={{ ...chip(false), padding: "7px 10px" }}
            >
              <option value="">Status izin…</option>
              {(Object.keys(LICENSE_LABEL) as LicenseStatus[]).map((k) => (
                <option key={k} value={k}>
                  {LICENSE_LABEL[k]}
                </option>
              ))}
            </select>
            <label className={styles.btnSecondary} style={{ cursor: uploadProgress === null ? "pointer" : "wait" }}>
              <Upload size={14} /> {uploadProgress === null ? "Unggah referensi" : `Mengunggah ${Math.round(uploadProgress * 100)}%`}
              <input
                ref={fileRef}
                type="file"
                hidden
                accept={ACCEPTED_MIMES.join(",")}
                disabled={uploadProgress !== null}
                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
              />
            </label>
          </div>
          {uploadError && <div style={{ ...errorBox, marginTop: 8 }}>{uploadError}</div>}
        </div>

        <div>
          <span style={label}>2. Tipe konten</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CONTENT_TYPES.map((t) => (
              <button key={t.value} type="button" style={chip(t.value === type)} onClick={() => setType(t.value)} aria-pressed={t.value === type}>
                {t.label}
                <span style={{ display: "block", fontSize: 11, fontWeight: 500, opacity: 0.8 }}>{t.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span style={label}>3. Funnel</span>
          <div style={{ display: "flex", gap: 8 }}>
            {(["A", "B"] as const).map((f) => (
              <button key={f} type="button" style={chip(f === funnel)} onClick={() => setFunnel(f)} aria-pressed={f === funnel}>
                {f === "A" ? "A · Calon brand pemula" : "B · Owner brand existing"}
              </button>
            ))}
          </div>
        </div>

        {formError && <div style={errorBox}>{formError}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" className={styles.btnPrimary} disabled={!refId || submitting} onClick={generate}>
            Generate
          </button>
          <span style={{ fontSize: 12, color: "#7a6a6a" }}>
            {selected ? `Referensi: ${selected.original_filename}` : "Pilih referensi dulu."} {submitting && <Sparkles size={12} />}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {jobs.map((job) => {
          const script = job.script_id ? scripts[job.script_id] : undefined;
          return (
            <div key={job.id} style={card}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                <strong style={{ fontSize: 13.5 }}>
                  {TYPE_LABEL[job.type] ?? job.type} · Funnel {job.funnel}
                </strong>
                <span className={job.status === "failed" ? styles.badgeWarning : styles.badgeSuccess}>{jobStageLabel(job)}</span>
              </div>
              {job.error && <div style={{ ...errorBox, marginBottom: 10 }}>{job.error}</div>}
              {jobErrors[job.id] && <div style={{ ...errorBox, marginBottom: 10 }}>{jobErrors[job.id]}</div>}

              {isClaimPending(job) && (
                <div style={{ border: "1px solid #f0c36d", background: "#fff8e6", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <strong style={{ fontSize: 12.5 }}>Klaim baru perlu keputusan</strong>
                  <p style={{ fontSize: 12, margin: "4px 0 8px" }}>
                    Versi tanpa klaim baru sudah dirender. Setujui untuk mendaftarkan klaim baru dan merender versi aslinya.
                  </p>
                  <textarea
                    aria-label="Catatan keputusan klaim"
                    placeholder="Catatan (opsional)"
                    value={notes[job.id] ?? ""}
                    onChange={(e) => setNotes((m) => ({ ...m, [job.id]: e.target.value }))}
                    style={{ width: "100%", minHeight: 48, fontSize: 12, borderRadius: 8, border: "1px solid #e2d6d6", padding: 8 }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" className={styles.btnPrimary} disabled={busy[`claim:${job.id}`]} onClick={() => decide(job, "approve")}>
                      <Check size={14} /> Setujui
                    </button>
                    <button type="button" className={styles.btnSecondary} disabled={busy[`claim:${job.id}`]} onClick={() => decide(job, "reject")}>
                      <X size={14} /> Tolak
                    </button>
                  </div>
                </div>
              )}

              {script && (
                <div style={{ display: "grid", gap: 6, fontSize: 12.5, marginBottom: 12 }}>
                  {script.hooks.map((h) => (
                    <div key={h.slot}>
                      <strong>{slotLabel(h.slot)}:</strong> {h.dialog ?? h.overlay_text}
                      {h.dialog && <span style={{ color: "#7a6a6a" }}> · teks layar: {h.overlay_text}</span>}
                    </div>
                  ))}
                  {script.body && (
                    <div>
                      <strong>Body:</strong> {script.body}
                    </div>
                  )}
                  {script.cta && (
                    <div>
                      <strong>CTA:</strong> {script.cta}
                    </div>
                  )}
                </div>
              )}

              {job.render_jobs.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                  {job.render_jobs.map((clip) => {
                    const url = clip.result_asset_id ? clipUrls[clip.result_asset_id] : undefined;
                    return (
                      <div key={clip.id} style={{ border: "1px solid #eee3e3", borderRadius: 10, padding: 8, fontSize: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <strong>{slotLabel(clip.content_slot)}</strong>
                          <span>{CLIP_STATUS_LABELS[clip.status] ?? clip.status}</span>
                        </div>
                        {url && <video src={url} controls playsInline style={{ width: "100%", borderRadius: 8, aspectRatio: "9 / 16", background: "#111" }} />}
                        {clip.status !== "done" && (clip.error || clip.stage_message) && (
                          <p style={{ margin: "4px 0", color: clip.status === "failed" ? "#a12a2a" : "#7a6a6a" }}>{clip.error || clip.stage_message}</p>
                        )}
                        {clip.status === "failed" && (
                          <button type="button" className={styles.btnSecondary} disabled={busy[`clip:${clip.id}`]} onClick={() => retryClip(job, clip)}>
                            <RefreshCw size={12} /> Render ulang
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {job.status === "failed" && (
                <button type="button" className={styles.btnSecondary} style={{ marginTop: 10 }} disabled={busy[`job:${job.id}`]} onClick={() => retryJob(job)}>
                  <RefreshCw size={14} /> Ulangi job
                </button>
              )}
            </div>
          );
        })}
        {!jobs.length && !loadError && <p style={{ fontSize: 12.5, color: "#7a6a6a" }}>Belum ada job konten.</p>}
      </div>
    </div>
  );
}
