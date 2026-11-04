"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { factory, FactoryError } from "@/lib/factoryClient";
import { uploadAsset } from "@/lib/factoryUpload";
import { REFERENCE_STATUSES, type AssetRecord, type LicenseStatus } from "@/lib/assetLabels";
import {
  flowStatus,
  isJobActive,
  projectCategory,
  type ContentJob,
  type ContentType,
  type ProjectFilter,
  type Quota,
  type Script,
} from "@/lib/contentStudio";
import StudioHeader, { type FlowState } from "./studio/StudioHeader";
import CreatePanel from "./studio/CreatePanel";
import ProjectBoard from "./studio/ProjectBoard";
import ProjectDetail from "./studio/ProjectDetail";
import s from "./studio/studio.module.css";

const POLL_MS = 5000;
const DEVICE_POLL_MS = 30000;

type Device = { id: string; name: string; is_active: boolean; last_seen_at: string | null };

const message = (e: unknown) => (e instanceof FactoryError ? e.message : "Terjadi galat. Coba lagi.");

export default function ContentStudioTab() {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [jobs, setJobs] = useState<ContentJob[]>([]);
  const [devices, setDevices] = useState<Device[] | null | undefined>(undefined);
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

  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [scripts, setScripts] = useState<Record<string, Script>>({});
  const [clipUrls, setClipUrls] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [jobErrors, setJobErrors] = useState<Record<string, string>>({});

  const loadQuota = useCallback(() => factory<Quota>("render-jobs/quota").then(setQuota), []);
  const loadJobs = useCallback(() => factory<ContentJob[]>("content-jobs").then(setJobs), []);
  const loadAssets = useCallback(() => factory<{ items: AssetRecord[] }>("assets?limit=60").then((p) => setAssets(p.items)), []);
  // Status mesin Flow hanya informasi; gagal dibaca tidak boleh menutupi studio.
  const loadDevices = useCallback(
    () =>
      factory<Device[]>("render-devices")
        .then(setDevices)
        .catch(() => setDevices(null)),
    [],
  );

  useEffect(() => {
    Promise.all([loadQuota(), loadJobs(), loadAssets()]).catch((e) => setLoadError(message(e)));
    loadDevices();
  }, [loadQuota, loadJobs, loadAssets, loadDevices]);

  // Perbarui progres hanya selama ada job yang masih berjalan dan tab ini terlihat.
  const active = jobs.some(isJobActive);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadJobs().catch(() => {});
      loadQuota().catch(() => {});
      loadDevices();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [active, loadJobs, loadQuota, loadDevices]);

  // Status mesin Flow tetap diperbarui walau tidak ada job aktif (mesin bisa hidup/mati kapan saja).
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") loadDevices();
    }, DEVICE_POLL_MS);
    return () => clearInterval(t);
  }, [loadDevices]);

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
          .then((sc) => setScripts((m) => ({ ...m, [sid]: sc })))
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

  // Presigned URL hanya berlaku 15 menit; bila video gagal dimuat, minta URL baru (sekali per kegagalan).
  const refreshClipUrl = useCallback((aid: string) => {
    if (requested.current.has(`r:${aid}`)) return;
    requested.current.add(`r:${aid}`);
    factory<AssetRecord>(`assets/${aid}`)
      .then((a) => a.original_url && setClipUrls((m) => ({ ...m, [aid]: a.original_url as string })))
      .catch(() => {})
      .finally(() => requested.current.delete(`r:${aid}`));
  }, []);

  const references = assets.filter((a) => REFERENCE_STATUSES.includes(a.status));
  const processing = assets.filter((a) => processingIds.includes(a.id) && a.status === "processing");
  const assetById = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets]);
  const counts = useMemo(() => {
    const c = { processing: 0, decision: 0, ready: 0, failed: 0 };
    for (const j of jobs) c[projectCategory(j)] += 1;
    return c;
  }, [jobs]);
  const now = new Date();
  const flow: FlowState = devices === undefined || devices === null ? "unknown" : flowStatus(devices, now);

  async function generate() {
    if (!refId || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      const job = await factory<ContentJob>("content-jobs", { method: "POST", body: { type, funnel, reference_asset_id: refId } });
      setJobs((list) => [job, ...list.filter((j) => j.id !== job.id)]);
      setOpenId(job.id);
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

  const closeDrawer = useCallback(() => setOpenId(null), []);

  // Drawer membaca job dari daftar terbaru, jadi ikut terbarui saat polling.
  const openJob = jobs.find((j) => j.id === openId) ?? null;

  return (
    <div className={s.studio}>
      <StudioHeader quota={quota} flow={flow} counts={counts} />
      {loadError && <div className={s.error}>{loadError}</div>}
      <div className={s.grid}>
        <CreatePanel
          references={references}
          processing={processing}
          refId={refId}
          onPickRef={setRefId}
          type={type}
          onType={setType}
          funnel={funnel}
          onFunnel={setFunnel}
          license={license}
          onLicense={setLicense}
          onUpload={onUpload}
          uploadProgress={uploadProgress}
          uploadError={uploadError}
          formError={formError}
          submitting={submitting}
          flowOffline={flow === "offline"}
          onGenerate={generate}
        />
        <ProjectBoard jobs={jobs} assets={assetById} filter={filter} onFilter={setFilter} onOpen={setOpenId} now={now} />
      </div>

      {openJob && (
        <ProjectDetail
          key={openJob.id}
          job={openJob}
          script={openJob.script_id ? scripts[openJob.script_id] : undefined}
          reference={assetById[openJob.reference_asset_id]}
          clipUrls={clipUrls}
          onClipError={refreshClipUrl}
          onDecide={(decision, note) =>
            act(`claim:${openJob.id}`, openJob.id, () =>
              factory(`content-jobs/${openJob.id}/claim-decision`, { method: "POST", body: { decision, note: note.trim() || null } }),
            )
          }
          onRetryJob={() => act(`job:${openJob.id}`, openJob.id, () => factory(`content-jobs/${openJob.id}/retry`, { method: "POST" }))}
          onRetryClip={(clipId) => act(`clip:${clipId}`, openJob.id, () => factory(`render-jobs/${clipId}/retry`, { method: "POST" }))}
          busy={busy}
          error={jobErrors[openJob.id] || undefined}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}
