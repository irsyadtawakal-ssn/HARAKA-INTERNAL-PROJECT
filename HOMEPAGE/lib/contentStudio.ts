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

export const CONTENT_TYPES: { value: ContentType; label: string; hint: string }[] = [
  { value: "video_ads", label: "Video Ads", hint: "15–30 dtk" },
  { value: "talking_head", label: "Talking Head", hint: "15–30 dtk" },
  { value: "hard_sell", label: "Hard Sell", hint: "maks 15 dtk" },
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
  const total = job.render_jobs.length;
  const done = job.render_jobs.filter((r) => r.status === "done").length;
  const failed = job.render_jobs.filter((r) => r.status === "failed").length;
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
