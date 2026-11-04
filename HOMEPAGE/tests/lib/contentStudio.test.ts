import { describe, it, expect } from "vitest";
import {
  isJobActive,
  jobStageLabel,
  slotLabel,
  isClaimPending,
  jobSteps,
  groupVideos,
  projectCategory,
  flowStatus,
  timeAgo,
  type ContentJob,
  type RenderJob,
  type Script,
} from "@/lib/contentStudio";

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

const ADS = ["hook1", "hook2", "hook3", "body", "cta"];
const script: Script = {
  id: "s1",
  headline: "H",
  caption: "C",
  body: "Isi body",
  cta: "Isi CTA",
  shot_list: [],
  hooks: [
    { slot: "hook1", dialog: "", overlay_text: "Teks hook 1" },
    { slot: "hook2", dialog: "Dialog hook 2", overlay_text: "x" },
    { slot: "hook3", dialog: null, overlay_text: "Teks hook 3" },
  ],
};
const states = (j: ContentJob) => jobSteps(j).map((s) => s.state);

describe("jobSteps", () => {
  it("starts with analysis active", () => expect(states(job("analyzing"))).toEqual(["active", "todo", "todo", "todo"]));
  it("counts clips while rendering", () => {
    const j = job("rendering", ADS.map((slot, i) => clip(i < 2 ? "done" : "queued", slot)), { script_id: "s1" });
    expect(states(j)).toEqual(["done", "done", "active", "todo"]);
    expect(jobSteps(j)[2].detail).toBe("2/5 klip");
  });
  it("fails analysis when there is no script yet", () => expect(states(job("failed"))[0]).toBe("failed"));
  it("fails the script step when the script exists", () =>
    expect(states(job("failed", [], { script_id: "s1" }))).toEqual(["done", "failed", "todo", "todo"]));
  it("marks everything done when all clips are done", () =>
    expect(states(job("rendering", ADS.map((s) => clip("done", s)), { script_id: "s1" }))).toEqual(["done", "done", "done", "done"]));
});

describe("groupVideos", () => {
  it("builds three ads videos from hook + body + cta", () => {
    const { videos, shared } = groupVideos(job("rendering", ADS.map((s) => clip("queued", s))), script);
    expect(videos).toHaveLength(3);
    expect(videos[0].clips.map((c) => c.content_slot)).toEqual(["hook1", "body", "cta"]);
    expect(videos[0].hookText).toBe("Teks hook 1");
    expect(videos[1].hookText).toBe("Dialog hook 2");
    expect(shared).toEqual({ body: "Isi body", cta: "Isi CTA" });
  });
  it("hard sell videos skip the body", () => {
    const j = job("rendering", ["hook1", "hook2", "hook3", "cta"].map((s) => clip("queued", s)), { type: "hard_sell" });
    expect(groupVideos(j).videos[1].clips.map((c) => c.content_slot)).toEqual(["hook2", "cta"]);
  });
  it("uses the newest clip per slot", () => {
    const old = { ...clip("done", "hook1"), id: "old", created_at: "2026-11-04T00:00:00Z" };
    const fresh = { ...clip("queued", "hook1"), id: "new", created_at: "2026-11-04T02:00:00Z" };
    expect(groupVideos(job("rendering", [old, fresh])).videos[0].clips[0].id).toBe("new");
  });
  it("keeps clips without content_slot apart", () => {
    const { others } = groupVideos(job("rendering", [{ ...clip("done"), content_slot: null }]));
    expect(others).toHaveLength(1);
  });
  it("lists missing slots before clips exist", () =>
    expect(groupVideos(job("writing")).videos[0].missing).toEqual(["hook1", "body", "cta"]));
});

describe("projectCategory", () => {
  it("failed job", () => expect(projectCategory(job("failed"))).toBe("failed"));
  it("rendering finished with a failed clip", () => expect(projectCategory(job("rendering", [clip("done"), clip("failed")]))).toBe("failed"));
  it("pending claim", () => expect(projectCategory(job("rendering", [clip("queued")], { claim_approval_id: "a", pending_script_id: "p" }))).toBe("decision"));
  it("all clips done", () => expect(projectCategory(job("rendering", [clip("done")]))).toBe("ready"));
  it("still working", () => expect(projectCategory(job("analyzing"))).toBe("processing"));
});

describe("flowStatus and timeAgo", () => {
  const now = new Date("2026-11-04T10:00:00Z");
  it("online when seen 30 s ago", () => expect(flowStatus([{ is_active: true, last_seen_at: "2026-11-04T09:59:30Z" }], now)).toBe("online"));
  it("offline when seen 10 min ago", () => expect(flowStatus([{ is_active: true, last_seen_at: "2026-11-04T09:50:00Z" }], now)).toBe("offline"));
  it("none without devices", () => expect(flowStatus([], now)).toBe("none"));
  it("ignores inactive devices", () =>
    expect(flowStatus([{ is_active: false, last_seen_at: "2026-11-04T09:59:50Z" }], now)).toBe("none"));
  it("formats relative time", () => {
    expect(timeAgo("2026-11-04T09:59:40Z", now)).toBe("baru saja");
    expect(timeAgo("2026-11-04T09:55:00Z", now)).toBe("5 menit lalu");
    expect(timeAgo("2026-11-04T07:00:00Z", now)).toBe("3 jam lalu");
    expect(timeAgo("2026-11-02T10:00:00Z", now)).toBe("2 hari lalu");
  });
});
