import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, within } from "@testing-library/react";
import ContentStudioTab from "@/components/dashboard/ContentStudioTab";

const photo = {
  id: "a1",
  type: "photo",
  status: "ready",
  original_filename: "serum.jpg",
  license_status: "internal",
  funnel: "A",
  thumbnail_url: null,
  parent_asset_id: null,
};

const baseJob = {
  id: "j1",
  type: "video_ads",
  funnel: "A",
  status: "analyzing",
  error: null,
  reference_asset_id: "a1",
  start_asset_id: null,
  script_id: null,
  pending_script_id: null,
  claim_approval_id: null,
  render_jobs: [] as unknown[],
  created_at: "2026-11-04T01:00:00Z",
  updated_at: "2026-11-04T01:00:00Z",
};

const clip = (slot: string, status = "queued", extra: Record<string, unknown> = {}) => ({
  id: `r-${slot}`,
  mode: "broll",
  slot: "broll",
  prompt: "p",
  target_duration: "8s",
  reference_asset_id: "a1",
  status,
  stage_message: null,
  attempts: 1,
  error: null,
  result_asset_id: null,
  content_slot: slot,
  created_at: "2026-11-04T01:00:00Z",
  updated_at: "2026-11-04T01:00:00Z",
  ...extra,
});

const script = {
  id: "s1",
  headline: "H",
  caption: "C",
  body: "Isi body",
  cta: "Isi CTA",
  shot_list: [],
  hooks: [
    { slot: "hook1", dialog: "", overlay_text: "Brand kamu masih placeholder?" },
    { slot: "hook2", dialog: "", overlay_text: "Hook dua" },
    { slot: "hook3", dialog: "", overlay_text: "Hook tiga" },
  ],
};

type Handler = (init: RequestInit | undefined) => { status?: number; body: unknown };

let routes: Record<string, Handler>;
let calls: { path: string; init?: RequestInit }[];

function respond(path: string, init?: RequestInit) {
  calls.push({ path, init });
  const key = `${init?.method ?? "GET"} ${path}`;
  const handler = routes[key] ?? routes[`${init?.method ?? "GET"} ${path.split("?")[0]}`];
  const out = handler ? handler(init) : { status: 404, body: { detail: "nope" } };
  return new Response(JSON.stringify(out.body), { status: out.status ?? 200, headers: { "content-type": "application/json" } });
}

const countCalls = (key: string) => calls.filter((c) => `${c.init?.method ?? "GET"} ${c.path.split("?")[0]}` === key).length;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  calls = [];
  routes = {
    "GET /api/factory/render-jobs/quota": () => ({ body: { limit: 30, used: 4, remaining: 26 } }),
    "GET /api/factory/assets": () => ({ body: { items: [photo], total: 1 } }),
    "GET /api/factory/content-jobs": () => ({ body: [] }),
    "GET /api/factory/render-devices": () => ({ body: [] }),
  };
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => respond(url, init)));
});

afterEach(() => {
  vi.useRealTimers();
});

async function mount() {
  const view = render(<ContentStudioTab />);
  await screen.findByText("26 / 30 klip");
  return view;
}

async function openProject() {
  fireEvent.click(await screen.findByTestId("project-card"));
  return screen.findByRole("dialog");
}

describe("ContentStudioTab", () => {
  it("shows remaining quota", async () => {
    await mount();
  });

  it("generate disabled until reference chosen", async () => {
    await mount();
    const button = screen.getByRole("button", { name: "Generate" });
    expect(button).toBeDisabled();
    fireEvent.click(await screen.findByRole("button", { name: /serum\.jpg/ }));
    expect(button).toBeEnabled();
  });

  it("double click creates one job", async () => {
    let resolve!: () => void;
    const gate = new Promise<void>((r) => (resolve = r));
    routes["POST /api/factory/content-jobs"] = () => ({ status: 201, body: baseJob });
    const origFetch = globalThis.fetch as unknown as (u: string, i?: RequestInit) => Promise<Response>;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === "POST") await gate;
        return origFetch(url, init);
      }),
    );
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: /serum\.jpg/ }));
    const button = screen.getByRole("button", { name: "Generate" });
    fireEvent.click(button);
    fireEvent.click(button);
    await act(async () => resolve());
    expect(countCalls("POST /api/factory/content-jobs")).toBe(1);
  });

  it("shows backend 422 detail", async () => {
    const detail = "Lisensi referensi belum jelas. Lengkapi izin sebelum dipakai.";
    routes["POST /api/factory/content-jobs"] = () => ({ status: 422, body: { detail } });
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: /serum\.jpg/ }));
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(await screen.findByText(detail)).toBeInTheDocument();
    expect(screen.queryByTestId("project-card")).not.toBeInTheDocument();
  });

  it("opens new job after generate", async () => {
    routes["POST /api/factory/content-jobs"] = () => ({ status: 201, body: baseJob });
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: /serum\.jpg/ }));
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Analisis referensi")).toBeInTheDocument();
  });

  it("shows claim decision when pending", async () => {
    const pending = { ...baseJob, status: "rendering", claim_approval_id: "ap1", pending_script_id: "s0" };
    routes["GET /api/factory/content-jobs"] = () => ({ body: [pending] });
    routes["POST /api/factory/content-jobs/j1/claim-decision"] = () => ({ body: { ...pending, pending_script_id: null } });
    await mount();
    const dialog = await openProject();
    fireEvent.click(within(dialog).getByRole("button", { name: "Setujui" }));
    await act(async () => {});
    const post = calls.find((c) => c.path === "/api/factory/content-jobs/j1/claim-decision");
    expect(post && JSON.parse(String(post.init?.body))).toMatchObject({ decision: "approve" });
  });

  it("opens detail with three videos", async () => {
    const job = { ...baseJob, status: "rendering", script_id: "s1", render_jobs: ["hook1", "hook2", "hook3", "body", "cta"].map((s) => clip(s)) };
    routes["GET /api/factory/content-jobs"] = () => ({ body: [job] });
    routes["GET /api/factory/scripts/s1"] = () => ({ body: script });
    await mount();
    const dialog = await openProject();
    for (const v of ["Video 1", "Video 2", "Video 3"]) expect(within(dialog).getByText(v)).toBeInTheDocument();
    expect(await within(dialog).findByText(/Brand kamu masih placeholder\?/)).toBeInTheDocument();
  });

  it("refreshes an expired clip URL when the video fails to load", async () => {
    const done = clip("hook1", "done", { result_asset_id: "v1" });
    routes["GET /api/factory/content-jobs"] = () => ({ body: [{ ...baseJob, status: "rendering", render_jobs: [done] }] });
    let n = 0;
    routes["GET /api/factory/assets/v1"] = () => ({ body: { id: "v1", type: "video", original_url: `https://s3/v1?sig=${++n}` } });
    await mount();
    const dialog = await openProject();
    await act(async () => {});
    const video = dialog.querySelector("video")!;
    expect(video.getAttribute("src")).toBe("https://s3/v1?sig=1");
    fireEvent.error(video);
    await act(async () => {});
    expect(dialog.querySelector("video")!.getAttribute("src")).toBe("https://s3/v1?sig=2");
  });

  it("detail stays open while polling", async () => {
    let n = 0;
    routes["GET /api/factory/content-jobs"] = () => ({ body: [n++ === 0 ? baseJob : { ...baseJob, status: "writing" }] });
    await mount();
    await openProject();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Tulis script").closest("[data-state]")?.getAttribute("data-state")).toBe("active");
  });

  it("shows flow offline from devices", async () => {
    routes["GET /api/factory/render-devices"] = () => ({
      body: [{ id: "d1", name: "VPS Flow 1", is_active: true, last_seen_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() }],
    });
    await mount();
    expect(await screen.findByText("Offline")).toBeInTheDocument();
  });

  it("polls while active and stops when idle", async () => {
    let n = 0;
    routes["GET /api/factory/content-jobs"] = () => ({ body: [n++ === 0 ? baseJob : { ...baseJob, status: "failed", error: "x" }] });
    await mount();
    await screen.findByTestId("project-card");
    expect(countCalls("GET /api/factory/content-jobs")).toBe(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(countCalls("GET /api/factory/content-jobs")).toBe(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(countCalls("GET /api/factory/content-jobs")).toBe(2);
  });
});
