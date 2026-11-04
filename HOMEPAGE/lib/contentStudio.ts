// Tipe dan helper murni tab Pembuatan Konten. Bentuk data mengikuti backend Factory (app/schemas.py).

export type RenderJob = {
  id: string;
  mode: "talking_head" | "broll";
  slot: "hook" | "body" | "cta" | "broll";
  prompt: string;
  target_duration: string | null;
  reference_asset_id: string;
  status: string;
  stage_message: string | null;
  attempts: number;
  error: string | null;
  result_asset_id: string | null;
  content_slot: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentJob = {
  id: string;
  type: ContentType;
  funnel: "A" | "B";
  status: string;
  error: string | null;
  reference_asset_id: string;
  start_asset_id: string | null;
  script_id: string | null;
  pending_script_id: string | null;
  claim_approval_id: string | null;
  render_jobs: RenderJob[];
  created_at: string;
  updated_at: string;
};

export type ScriptHook = { slot: string; dialog: string | null; overlay_text: string };

export type Script = {
  id: string;
  headline: string | null;
  caption: string | null;
  hooks: ScriptHook[];
  body: string;
  cta: string | null;
  shot_list: { slot: string; dialog?: string | null; overlay_text?: string }[];
};

export type Quota = { limit: number; used: number; remaining: number };

export type ContentType = "video_ads" | "talking_head" | "hard_sell";

export const CONTENT_TYPES: { value: ContentType; label: string; hint: string; clips: number; summary: string }[] = [
  { value: "video_ads", label: "Video Ads", hint: "15–30 dtk", clips: 5, summary: "Hook → B-roll produk/pabrik → CTA" },
  { value: "talking_head", label: "Talking Head", hint: "15–30 dtk", clips: 5, summary: "Avatar bicara: hook, isi, CTA" },
  { value: "hard_sell", label: "Hard Sell", hint: "maks 15 dtk", clips: 4, summary: "Tawaran langsung + CTA WA" },
];

const AI_STAGES: Record<string, string> = {
  queued: "Menunggu antrian",
  analyzing: "Menganalisis referensi",
  writing: "Menulis script",
  failed: "Gagal",
};

export const CLIP_STATUS_LABELS: Record<string, string> = {
  queued: "Antri",
  claimed: "Diambil Flow",
  uploading_ref: "Upload referensi",
  generating: "Generate di Flow",
  downloading: "Mengunduh",
  downloaded: "Menyimpan",
  done: "Siap",
  failed: "Gagal",
};

const clipFinished = (r: RenderJob) => r.status === "done" || r.status === "failed";

export function isJobActive(job: ContentJob): boolean {
  if (job.status === "queued" || job.status === "analyzing" || job.status === "writing") return true;
  if (job.status === "rendering") return job.render_jobs.some((r) => !clipFinished(r));
  return false;
}

export function jobStageLabel(job: ContentJob): string {
  if (job.status !== "rendering") return AI_STAGES[job.status] ?? job.status;
  const clips = currentClips(job);
  const total = clips.length;
  const done = clips.filter((r) => r.status === "done").length;
  const failed = clips.filter((r) => r.status === "failed").length;
  if (done + failed < total) return `Render klip ${done + 1}/${total}`;
  return failed ? `${done} klip siap, ${failed} gagal` : "Klip siap";
}

export function slotLabel(slot: string | null): string {
  if (!slot) return "Klip";
  const hook = /^hook(\d)$/.exec(slot);
  if (hook) return `Hook ${hook[1]}`;
  return slot === "cta" ? "CTA" : slot === "body" ? "Body" : slot;
}

/** Ada klaim baru yang menunggu keputusan owner (gerbang 1, spec §3.4). */
export function isClaimPending(job: ContentJob): boolean {
  return Boolean(job.claim_approval_id && job.pending_script_id);
}

// --- Tampilan studio ---

export type StepState = "done" | "active" | "todo" | "failed";
export type Step = { key: "analysis" | "script" | "render" | "ready"; label: string; state: StepState; detail?: string };

export function jobSteps(job: ContentJob): Step[] {
  const clips = currentClips(job);
  const total = clips.length;
  const done = clips.filter((r) => r.status === "done").length;
  const failedClips = clips.filter((r) => r.status === "failed").length;
  const failed = job.status === "failed";
  const hasScript = Boolean(job.script_id) || job.status === "rendering";
  // start_asset_id tersimpan bersama status "writing", jadi menandai analisis sudah lewat.
  const analysed = hasScript || Boolean(job.start_asset_id) || job.status === "writing";

  const analysis: StepState =
    job.status === "queued" || job.status === "analyzing" ? "active" : failed && !analysed ? "failed" : "done";
  const script: StepState =
    job.status === "writing" ? "active" : failed && analysed ? "failed" : hasScript ? "done" : "todo";
  let render: StepState = "todo";
  let detail: string | undefined;
  if (job.status === "rendering") {
    detail = `${done}/${total} klip`;
    render = done + failedClips < total || total === 0 ? "active" : failedClips ? "failed" : "done";
  }
  const ready: StepState = total > 0 && done === total ? "done" : "todo";
  return [
    { key: "analysis", label: "Analisis referensi", state: analysis },
    { key: "script", label: "Tulis script", state: script },
    { key: "render", label: "Render di Flow", state: render, detail },
    { key: "ready", label: "Klip siap", state: ready },
  ];
}

export type VideoPlan = {
  index: 1 | 2 | 3;
  hookSlot: "hook1" | "hook2" | "hook3";
  hookText: string | null;
  clips: RenderJob[];
  missing: string[];
};

/** Satu Generate = 3 video (spec §3.3): hook berbeda, body dan CTA dipakai bersama; Hard Sell tanpa body. */
function tailSlots(job: ContentJob): string[] {
  return job.type === "hard_sell" ? ["cta"] : ["body", "cta"];
}

/** Klip terbaru per slot, klip tanpa slot dikenal, dan klip lama yang sudah digantikan (versi sebelum klaim disetujui). */
function splitClips(job: ContentJob) {
  const known = new Set(["hook1", "hook2", "hook3", ...tailSlots(job)]);
  const latest = new Map<string, RenderJob>();
  const others: RenderJob[] = [];
  const previous: RenderJob[] = [];
  for (const clip of job.render_jobs) {
    const slot = clip.content_slot;
    if (!slot || !known.has(slot)) {
      others.push(clip);
      continue;
    }
    const prev = latest.get(slot);
    if (!prev) latest.set(slot, clip);
    else if (prev.created_at < clip.created_at) {
      previous.push(prev);
      latest.set(slot, clip);
    } else previous.push(clip);
  }
  return { latest, others, previous };
}

/** Klip yang menentukan progres: versi lama yang sudah digantikan tidak dihitung. */
export function currentClips(job: ContentJob): RenderJob[] {
  const { latest, others } = splitClips(job);
  return [...latest.values(), ...others];
}

export function groupVideos(
  job: ContentJob,
  script?: Script,
): { videos: VideoPlan[]; shared: { body: string | null; cta: string | null }; others: RenderJob[]; previous: RenderJob[] } {
  const tail = tailSlots(job);
  const { latest, others, previous } = splitClips(job);
  const videos = ([1, 2, 3] as const).map((index) => {
    const hookSlot = `hook${index}` as const;
    const slots = [hookSlot, ...tail];
    const hook = script?.hooks.find((h) => h.slot === hookSlot);
    return {
      index,
      hookSlot,
      hookText: hook ? hook.dialog || hook.overlay_text || null : null,
      clips: slots.map((s) => latest.get(s)).filter((c): c is RenderJob => Boolean(c)),
      missing: slots.filter((s) => !latest.has(s)),
    };
  });
  return { videos, shared: { body: script?.body || null, cta: script?.cta || null }, others, previous };
}

export type ProjectFilter = "all" | "processing" | "decision" | "ready" | "failed";

export function projectCategory(job: ContentJob): Exclude<ProjectFilter, "all"> {
  const clips = currentClips(job);
  const finished = clips.length > 0 && clips.every(clipFinished);
  if (job.status === "failed" || (job.status === "rendering" && finished && clips.some((c) => c.status === "failed"))) return "failed";
  if (isClaimPending(job)) return "decision";
  if (job.status === "rendering" && finished) return "ready";
  return "processing";
}

/** Extension melapor tiap 1–2 dtk; tanpa kabar 2 menit berarti mesin render tidak jalan. */
export function flowStatus(devices: { is_active: boolean; last_seen_at: string | null }[], now: Date): "online" | "offline" | "none" {
  const active = devices.filter((d) => d.is_active);
  if (!active.length) return "none";
  const online = active.some((d) => d.last_seen_at && now.getTime() - new Date(d.last_seen_at).getTime() <= 2 * 60 * 1000);
  return online ? "online" : "offline";
}

export function timeAgo(iso: string, now: Date): string {
  const s = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}
