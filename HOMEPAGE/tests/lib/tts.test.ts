import { describe, it, expect, vi, beforeEach } from "vitest";
import { listVoices, synthesize } from "@/lib/tts";

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("synthesize", () => {
  it("reports ElevenLabs' own reason instead of a bare status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ detail: { status: "quota_exceeded", message: "Quota habis" } }, { status: 401 }))
    );
    await expect(synthesize("Halo", { elevenlabsApiKey: "k", voiceId: "v" })).rejects.toThrow("401 — Quota habis");
  });

  it("says which setting is missing", async () => {
    await expect(synthesize("Halo", { elevenlabsApiKey: "", voiceId: "v" })).rejects.toThrow("API Key");
  });
});

describe("listVoices", () => {
  it("lists account voices, own and library voices before premade ones", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        voices: [
          { voice_id: "p1", name: "Rachel", category: "premade", labels: { gender: "female", accent: "american" }, preview_url: "https://x/p1.mp3" },
          { voice_id: "c1", name: "Rara Indo", category: "cloned", labels: {}, preview_url: "" },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const voices = await listVoices("k");

    expect(voices.map((v) => v.voiceId)).toEqual(["c1", "p1"]);
    expect(voices[1]).toMatchObject({ name: "Rachel", description: "female, american", previewUrl: "https://x/p1.mp3" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": "k" } });
  });
});
