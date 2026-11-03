import { describe, it, expect, vi, beforeEach } from "vitest";
import { listModels } from "@/lib/llm";

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("listModels", () => {
  it("returns sorted model ids from the /models route", async () => {
    const fetchMock = vi.fn(async () => Response.json({ data: [{ id: "kr/claude" }, { id: "cc/gpt" }, { foo: 1 }] }));
    vi.stubGlobal("fetch", fetchMock);

    const models = await listModels({ baseUrl: "http://router/v1/", apiKey: "k" });

    expect(models).toEqual(["cc/gpt", "kr/claude"]);
    expect(fetchMock).toHaveBeenCalledWith("http://router/v1/models", { headers: { authorization: "Bearer k" } });
  });

  it("fails clearly without an API key or on a bad response", async () => {
    await expect(listModels({ baseUrl: "http://router/v1", apiKey: "" })).rejects.toThrow("API Key");

    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    await expect(listModels({ baseUrl: "http://router/v1", apiKey: "k" })).rejects.toThrow("401");
  });
});
