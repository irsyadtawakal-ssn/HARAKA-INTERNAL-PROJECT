import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/tts/route";

const fetchMock = vi.fn();

function req(text: string) {
  return new Request("http://x/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
}

beforeEach(() => {
  process.env.ELEVENLABS_API_KEY = "k";
  process.env.ELEVENLABS_VOICE_ID = "voice1";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("POST /api/tts", () => {
  it("returns mp3 audio from ElevenLabs", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    const res = await POST(req("Halo Kak"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(fetchMock.mock.calls[0][0]).toContain("/v1/text-to-speech/voice1");
  });

  it.each([401, 429, 500])("maps upstream %s to 503 tts_unavailable", async (status) => {
    fetchMock.mockResolvedValue(new Response("no", { status }));
    const res = await POST(req("Halo"));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("tts_unavailable");
  });

  it("rejects text longer than 600 characters", async () => {
    const res = await POST(req("a".repeat(601)));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("strips the lead marker before synthesis", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }));
    await POST(req("Boleh minta nomornya, Kak?\n[[LEAD]]"));
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.text).toBe("Boleh minta nomornya, Kak?");
  });
});

describe("POST /api/tts rate limit", () => {
  it("refuses the 21st request per IP within a minute", async () => {
    fetchMock.mockImplementation(async () => new Response(new Uint8Array([1]), { status: 200 }));
    const r = () => new Request("http://x/api/tts", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.9" }, body: JSON.stringify({ text: "Halo" }) });
    for (let i = 0; i < 20; i++) expect((await POST(r())).status).toBe(200);
    expect((await POST(r())).status).toBe(429);
  });
});
