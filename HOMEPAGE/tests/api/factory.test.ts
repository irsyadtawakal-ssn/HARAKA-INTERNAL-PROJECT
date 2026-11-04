import { describe, it, expect, vi, beforeEach } from "vitest";

const { factoryFetch, FactoryConfigError } = vi.hoisted(() => {
  class FactoryConfigError extends Error {}
  return { factoryFetch: vi.fn(), FactoryConfigError };
});
vi.mock("@/lib/factory", () => ({ factoryFetch, FactoryConfigError }));

const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) });

function req(path: string, init: RequestInit & { origin?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("host", "faq.harakaerfi.com");
  if (init.origin) headers.set("origin", init.origin);
  return new Request(`https://faq.harakaerfi.com/api/factory/${path}`, { ...init, headers });
}

beforeEach(() => {
  factoryFetch.mockReset();
  factoryFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }));
});

describe("/api/factory/[...path]", () => {
  it("forwards allowed GET with query", async () => {
    const { GET } = await import("@/app/api/factory/[...path]/route");
    const res = await GET(req("assets?type=photo"), ctx(["assets"]));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(factoryFetch).toHaveBeenCalledWith("assets", expect.objectContaining({ method: "GET", search: "?type=photo" }));
  });

  it("forwards POST body", async () => {
    const { POST } = await import("@/app/api/factory/[...path]/route");
    const body = JSON.stringify({ type: "video_ads", funnel: "A", reference_asset_id: "x" });
    await POST(req("content-jobs", { method: "POST", body, origin: "https://faq.harakaerfi.com" }), ctx(["content-jobs"]));
    expect(factoryFetch).toHaveBeenCalledWith("content-jobs", expect.objectContaining({ method: "POST", body }));
  });

  it.each([["users"], ["render-devices"], ["flow", "claim"], ["auth", "login"], ["assets", "..", "users"]])(
    "rejects paths outside allowlist: %s",
    async (...path) => {
      const { GET } = await import("@/app/api/factory/[...path]/route");
      const res = await GET(req(path.join("/")), ctx(path));
      expect(res.status).toBe(404);
      expect(factoryFetch).not.toHaveBeenCalled();
    },
  );

  it("rejects cross-origin write", async () => {
    const { POST } = await import("@/app/api/factory/[...path]/route");
    const res = await POST(req("content-jobs", { method: "POST", body: "{}", origin: "https://evil.test" }), ctx(["content-jobs"]));
    expect(res.status).toBe(403);
    expect(factoryFetch).not.toHaveBeenCalled();
  });

  it("maps network failure to 502", async () => {
    factoryFetch.mockRejectedValue(new TypeError("fetch failed"));
    const { GET } = await import("@/app/api/factory/[...path]/route");
    const res = await GET(req("render-jobs/quota"), ctx(["render-jobs", "quota"]));
    expect(res.status).toBe(502);
    expect((await res.json()).detail).toBe("Server Factory tidak bisa dihubungi.");
  });

  it("maps missing config to 503", async () => {
    factoryFetch.mockRejectedValue(new FactoryConfigError());
    const { GET } = await import("@/app/api/factory/[...path]/route");
    const res = await GET(req("render-jobs/quota"), ctx(["render-jobs", "quota"]));
    expect(res.status).toBe(503);
    expect((await res.json()).detail).toBe("Dashboard belum tersambung ke Factory (FACTORY_* belum diisi).");
  });
});
