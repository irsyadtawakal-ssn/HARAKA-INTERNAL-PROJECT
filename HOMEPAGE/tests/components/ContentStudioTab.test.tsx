import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
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
  render_jobs: [],
  created_at: "2026-11-04T01:00:00Z",
  updated_at: "2026-11-04T01:00:00Z",
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
  };
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => respond(url, init)));
});

afterEach(() => {
  vi.useRealTimers();
});

async function mount() {
  render(<ContentStudioTab />);
  await screen.findByText("Sisa 26 dari 30 klip hari ini");
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
    expect(screen.queryByText("Menganalisis referensi")).not.toBeInTheDocument();
  });

  it("shows claim decision when pending", async () => {
    const pending = { ...baseJob, status: "rendering", claim_approval_id: "ap1", pending_script_id: "s0" };
    routes["GET /api/factory/content-jobs"] = () => ({ body: [pending] });
    routes["POST /api/factory/content-jobs/j1/claim-decision"] = () => ({ body: { ...pending, pending_script_id: null } });
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: "Setujui" }));
    await act(async () => {});
    const post = calls.find((c) => c.path === "/api/factory/content-jobs/j1/claim-decision");
    expect(post && JSON.parse(String(post.init?.body))).toMatchObject({ decision: "approve" });
  });

  it("refreshes an expired clip URL when the video fails to load", async () => {
    const clip = { id: "r1", mode: "broll", slot: "broll", prompt: "p", target_duration: "8s", reference_asset_id: "a1", status: "done", stage_message: null, attempts: 1, error: null, result_asset_id: "v1", content_slot: "hook1", created_at: "", updated_at: "" };
    routes["GET /api/factory/content-jobs"] = () => ({ body: [{ ...baseJob, status: "rendering", render_jobs: [clip] }] });
    let n = 0;
    routes["GET /api/factory/assets/v1"] = () => ({ body: { id: "v1", type: "video", original_url: `https://s3/v1?sig=${++n}` } });
    const { container } = render(<ContentStudioTab />);
    await screen.findByText("Klip siap");
    await act(async () => {});
    const video = container.querySelector("video")!;
    expect(video.getAttribute("src")).toBe("https://s3/v1?sig=1");
    fireEvent.error(video);
    await act(async () => {});
    expect(container.querySelector("video")!.getAttribute("src")).toBe("https://s3/v1?sig=2");
  });

  it("shows the on-screen text for hooks without dialog", async () => {
    routes["GET /api/factory/content-jobs"] = () => ({ body: [{ ...baseJob, status: "failed", error: "x", script_id: "s1" }] });
    routes["GET /api/factory/scripts/s1"] = () => ({
      body: { id: "s1", headline: "H", caption: "C", body: "B", cta: "C", shot_list: [], hooks: [{ slot: "hook1", dialog: "", overlay_text: "Brand kamu masih placeholder?" }] },
    });
    await mount();
    expect(await screen.findByText(/Brand kamu masih placeholder\?/)).toBeInTheDocument();
  });

  it("polls while active and stops when idle", async () => {
    let n = 0;
    routes["GET /api/factory/content-jobs"] = () => ({ body: [n++ === 0 ? baseJob : { ...baseJob, status: "failed", error: "x" }] });
    await mount();
    await screen.findByText("Menganalisis referensi");
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
