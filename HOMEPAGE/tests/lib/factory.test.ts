import { describe, it, expect, vi, beforeEach } from "vitest";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function isLogin(url: string) {
  return url.endsWith("/auth/login");
}

beforeEach(async () => {
  vi.resetModules();
  process.env.FACTORY_API_URL = "http://factory:8010/";
  process.env.FACTORY_EMAIL = "owner@uji.id";
  process.env.FACTORY_PASSWORD = "rahasia-owner";
});

describe("factoryFetch", () => {
  it("logs in once for two calls", async () => {
    const fetchMock = vi.fn(async (url: string) => (isLogin(url) ? json({ access_token: "t1" }) : json({ ok: true })));
    vi.stubGlobal("fetch", fetchMock);
    const { factoryFetch } = await import("@/lib/factory");
    await factoryFetch("assets");
    const res = await factoryFetch("assets", { search: "?type=photo" });
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls.filter(([u]) => isLogin(u))).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[2];
    expect(url).toBe("http://factory:8010/assets?type=photo");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer t1" });
  });

  it("re-logins once on 401 then retries", async () => {
    let logins = 0;
    let calls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (isLogin(url)) return json({ access_token: `t${++logins}` });
      return ++calls === 1 ? json({ detail: "expired" }, 401) : json({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { factoryFetch } = await import("@/lib/factory");
    const res = await factoryFetch("content-jobs");
    expect(res.status).toBe(200);
    expect(logins).toBe(2);
    expect((fetchMock.mock.calls.at(-1)![1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer t2" });
  });

  it("gives up after second 401", async () => {
    const fetchMock = vi.fn(async (url: string) => (isLogin(url) ? json({ access_token: "t" }) : json({ detail: "no" }, 401)));
    vi.stubGlobal("fetch", fetchMock);
    const { factoryFetch } = await import("@/lib/factory");
    const res = await factoryFetch("content-jobs");
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("throws FactoryConfigError when env missing", async () => {
    delete process.env.FACTORY_PASSWORD;
    vi.stubGlobal("fetch", vi.fn());
    const { factoryFetch, FactoryConfigError } = await import("@/lib/factory");
    await expect(factoryFetch("assets")).rejects.toBeInstanceOf(FactoryConfigError);
  });

  it("never puts the password in the request URL", async () => {
    const fetchMock = vi.fn(async (url: string) => (isLogin(url) ? json({ access_token: "t" }) : json({})));
    vi.stubGlobal("fetch", fetchMock);
    const { factoryFetch } = await import("@/lib/factory");
    await factoryFetch("assets");
    for (const [url] of fetchMock.mock.calls) expect(String(url)).not.toContain("rahasia-owner");
  });
});
