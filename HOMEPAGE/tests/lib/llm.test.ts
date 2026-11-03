import { describe, it, expect, vi, beforeEach } from "vitest";
import { completeChat, listModels } from "@/lib/llm";

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

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "Invalid API key" }, { status: 401 })));
    await expect(listModels({ baseUrl: "http://router/v1", apiKey: "k" })).rejects.toThrow("401 — Invalid API key");
  });
});

describe("completeChat", () => {
  it("reports the router's error message instead of a bare status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: { message: "Model gemini-2.5-flash not found" } }, { status: 400 }))
    );
    await expect(
      completeChat([{ role: "user", content: "halo" }], "sys", { baseUrl: "http://router/v1", apiKey: "k", model: "x" })
    ).rejects.toThrow("400 — Model gemini-2.5-flash not found");
  });

  it("joins the reply when the router answers with an SSE stream", async () => {
    const sse = [
      'data: {"id":"1","choices":[{"delta":{"content":"Halo "}}]}',
      'data: {"id":"1","choices":[{"delta":{"content":"Kak"}}]}',
      "data: [DONE]",
    ].join("\n\n");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(sse, { headers: { "content-type": "text/event-stream" } })));
    await expect(
      completeChat([{ role: "user", content: "halo" }], "sys", { baseUrl: "http://router/v1", apiKey: "k", model: "x" })
    ).resolves.toBe("Halo Kak");
  });

  it("asks for a model when none is selected", async () => {
    await expect(
      completeChat([{ role: "user", content: "halo" }], "sys", { baseUrl: "http://router/v1", apiKey: "k", model: "" })
    ).rejects.toThrow("belum dipilih");
  });
});
