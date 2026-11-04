import { describe, it, expect } from "vitest";
import { isJobActive, jobStageLabel, slotLabel, isClaimPending, type ContentJob, type RenderJob } from "@/lib/contentStudio";

const clip = (status: string, content_slot = "hook1"): RenderJob => ({
  id: `r-${Math.random()}`,
  mode: "broll",
  slot: "broll",
  prompt: "p",
  target_duration: "8s",
  reference_asset_id: "a",
  status,
  stage_message: null,
  attempts: 0,
  error: null,
  result_asset_id: null,
  content_slot,
  created_at: "2026-11-04T00:00:00Z",
  updated_at: "2026-11-04T00:00:00Z",
});

const job = (status: string, render_jobs: RenderJob[] = [], extra: Partial<ContentJob> = {}): ContentJob => ({
  id: "j1",
  type: "video_ads",
  funnel: "A",
  status,
  error: null,
  reference_asset_id: "a",
  start_asset_id: null,
  script_id: null,
  pending_script_id: null,
  claim_approval_id: null,
  render_jobs,
  created_at: "2026-11-04T00:00:00Z",
  updated_at: "2026-11-04T00:00:00Z",
  ...extra,
});

describe("isJobActive", () => {
  it("is true while analyzing", () => expect(isJobActive(job("analyzing"))).toBe(true));
  it("is true while a clip is still generating", () =>
    expect(isJobActive(job("rendering", [clip("done"), clip("generating")]))).toBe(true));
  it("is false when every clip is done or failed", () =>
    expect(isJobActive(job("rendering", [clip("done"), clip("failed")]))).toBe(false));
  it("is false for a failed job", () => expect(isJobActive(job("failed"))).toBe(false));
});

describe("jobStageLabel", () => {
  it("names the AI stages", () => {
    expect(jobStageLabel(job("analyzing"))).toBe("Menganalisis referensi");
    expect(jobStageLabel(job("writing"))).toBe("Menulis script");
  });
  it("counts clips while rendering", () =>
    expect(jobStageLabel(job("rendering", [clip("done"), clip("generating"), clip("queued"), clip("queued"), clip("queued")]))).toBe(
      "Render klip 2/5",
    ));
  it("says ready when all clips are done", () => expect(jobStageLabel(job("rendering", [clip("done"), clip("done")]))).toBe("Klip siap"));
  it("reports failed clips once rendering stops", () =>
    expect(jobStageLabel(job("rendering", [clip("done"), clip("failed")]))).toBe("1 klip siap, 1 gagal"));
});

describe("slotLabel and isClaimPending", () => {
  it("labels slots", () => {
    expect(slotLabel("hook2")).toBe("Hook 2");
    expect(slotLabel("cta")).toBe("CTA");
    expect(slotLabel(null)).toBe("Klip");
  });
  it("detects a pending claim decision", () => {
    expect(isClaimPending(job("rendering", [], { claim_approval_id: "ap", pending_script_id: "s" }))).toBe(true);
    expect(isClaimPending(job("rendering", [], { claim_approval_id: "ap", pending_script_id: null }))).toBe(false);
  });
});
