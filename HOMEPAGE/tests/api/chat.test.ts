import { describe, it, expect, vi, beforeEach } from "vitest";

const { logChat } = vi.hoisted(() => ({ logChat: vi.fn(async (_rows: unknown) => {}) }));
vi.mock("@/lib/supabase", () => ({ logChat, saveLead: vi.fn() }));

function sse(deltas: string[]) {
  const body = deltas.map((d) => `data: ${JSON.stringify({ choices: [{ delta: { content: d } }] })}\n\n`).join("") + "data: [DONE]\n\n";
  return new Response(body, { headers: { "content-type": "text/event-stream" } });
}

function req(body: unknown, ip = "1.1.1.1") {
  return new Request("http://x/api/chat", { method: "POST", headers: { "x-forwarded-for": ip, "content-type": "application/json" }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.resetModules();
  process.env.LLM_BASE_URL = "http://llm";
  process.env.LLM_API_KEY = "k";
  process.env.LLM_MODEL = "m";
  vi.stubGlobal("fetch", vi.fn(async () => sse(["Halo ", "Kak"])));
});

describe("POST /api/chat", () => {
  it("streams the model reply as plain text", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(req({ sessionId: "s1", messages: [{ role: "user", content: "halo" }] }));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Halo Kak");
  });

  it("refuses the 21st user turn in a session", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const messages = Array.from({ length: 41 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: "x" }));
    const res = await POST(req({ sessionId: "s2", messages }, "2.2.2.2"));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("Sesi demo ini sudah mencapai batas. Silakan lanjut via WhatsApp 0831-3703-0656.");
  });

  it("refuses the 31st request per IP within a minute", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const body = { sessionId: "s3", messages: [{ role: "user", content: "halo" }] };
    for (let i = 0; i < 30; i++) await POST(req(body, "3.3.3.3"));
    const res = await POST(req(body, "3.3.3.3"));
    expect(res.status).toBe(429);
  });

  it("logs the exchange with phone numbers redacted", async () => {
    logChat.mockClear();
    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(req({ sessionId: "s4", messages: [{ role: "user", content: "WA aku 0812-3456-7890" }] }, "4.4.4.4"));
    await res.text();
    await vi.waitFor(() => expect(logChat).toHaveBeenCalledTimes(1));
    expect(logChat.mock.calls[0][0]).toEqual([
      { session_id: "s4", role: "user", content: "WA aku [nomor]" },
      { session_id: "s4", role: "assistant", content: "Halo Kak" },
    ]);
  });

  it("still answers when logging fails", async () => {
    logChat.mockRejectedValueOnce(new Error("db down"));
    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(req({ sessionId: "s5", messages: [{ role: "user", content: "halo" }] }, "5.5.5.5"));
    expect(await res.text()).toBe("Halo Kak");
  });
});

describe("POST /api/chat hardening", () => {
  it("rejects oversized histories", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const messages = [{ role: "user", content: "a".repeat(2000) }, ...Array.from({ length: 12 }, () => ({ role: "assistant", content: "b".repeat(2000) })), { role: "user", content: "c" }];
    const res = await POST(req({ sessionId: "s6", messages }, "6.6.6.6"));
    expect(res.status).toBe(400);
  });

  it("counts turns per session on the server even if the client trims history", async () => {
    const { POST } = await import("@/app/api/chat/route");
    for (let i = 0; i < 20; i++) {
      const res = await POST(req({ sessionId: "s7", messages: [{ role: "user", content: "halo" }] }, `10.0.0.${i}`));
      await res.text();
    }
    const res = await POST(req({ sessionId: "s7", messages: [{ role: "user", content: "halo" }] }, "10.0.1.1"));
    expect(res.status).toBe(429);
  });
});
