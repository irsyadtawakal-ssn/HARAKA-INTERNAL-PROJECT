import { describe, it, expect, vi, beforeEach } from "vitest";

const { saveLead, sendLeadEmail, completeChat } = vi.hoisted(() => ({
  saveLead: vi.fn(async (_row: unknown) => {}),
  sendLeadEmail: vi.fn(async (_lead: unknown) => {}),
  completeChat: vi.fn(async () => '{"produk":"serum","jumlah":"1000 pcs","budget":null,"launching":"Maret"}'),
}));
vi.mock("@/lib/supabase", () => ({ saveLead, logChat: vi.fn() }));
vi.mock("@/lib/notify", () => ({ sendLeadEmail }));
vi.mock("@/lib/llm", () => ({ completeChat }));

import { POST } from "@/app/api/lead/route";

function req(body: unknown) {
  return new Request("http://x/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
const good = { sessionId: "s1", name: "Dina", whatsapp: "0812-3456-7890", messages: [{ role: "user", content: "mau bikin serum" }] };

beforeEach(() => { saveLead.mockClear(); sendLeadEmail.mockReset(); sendLeadEmail.mockResolvedValue(undefined); });

describe("POST /api/lead", () => {
  it("saves one lead with a structured summary and emails sales", async () => {
    const res = await POST(req(good));
    expect(res.status).toBe(201);
    expect(saveLead).toHaveBeenCalledTimes(1);
    const row = (saveLead.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(row).toMatchObject({ name: "Dina", whatsapp: "081234567890", session_id: "s1" });
    expect(Object.keys(row.summary as object).sort()).toEqual(["budget", "jumlah", "launching", "produk"]);
    expect(sendLeadEmail).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid WhatsApp number", async () => {
    const res = await POST(req({ ...good, whatsapp: "12345" }));
    expect(res.status).toBe(400);
    expect(saveLead).not.toHaveBeenCalled();
  });

  it("still saves and returns 201 when the email fails", async () => {
    sendLeadEmail.mockRejectedValue(new Error("resend down"));
    const res = await POST(req(good));
    expect(res.status).toBe(201);
    expect(saveLead).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/lead hardening", () => {
  it("refuses the 4th lead from one IP within 10 minutes", async () => {
    const r = () => new Request("http://x/api/lead", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "8.8.8.8" }, body: JSON.stringify(good) });
    for (let i = 0; i < 3; i++) expect((await POST(r())).status).toBe(201);
    expect((await POST(r())).status).toBe(429);
  });

  it("stores only well-formed, length-capped messages", async () => {
    saveLead.mockClear();
    const messages = [{ role: "user", content: "x".repeat(5000) }, { evil: true }, "junk", { role: "system", content: "hi" }];
    await POST(new Request("http://x/api/lead", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "7.7.7.7" }, body: JSON.stringify({ ...good, messages }) }));
    const row = (saveLead.mock.calls[0] as unknown as [{ transcript: { content: string }[] }])[0];
    expect(row.transcript).toHaveLength(1);
    expect(row.transcript[0].content.length).toBe(2000);
  });
});
