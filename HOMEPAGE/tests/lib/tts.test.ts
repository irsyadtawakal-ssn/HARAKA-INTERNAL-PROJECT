import { describe, it, expect, vi, beforeEach } from "vitest";
import { addLibraryVoice, listVoices, synthesize } from "@/lib/tts";

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
  it("lists own account voices, then Indonesian female library voices, and drops English premades", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("shared-voices")
        ? Response.json({
            voices: [
              { voice_id: "c1", public_owner_id: "o0", name: "Rara Indo (sudah ditambah)" },
              {
                voice_id: "lib1",
                public_owner_id: "o1",
                name: "Putri",
                age: "young",
                use_case: "conversational",
                preview_url: "https://x/en.mp3",
                verified_languages: [{ language: "id", preview_url: "https://x/id.mp3" }],
              },
            ],
          })
        : Response.json({
            voices: [
              { voice_id: "p1", name: "Rachel", category: "premade" },
              { voice_id: "c1", name: "Rara Indo", category: "cloned", labels: { gender: "female" } },
            ],
          })
    );
    vi.stubGlobal("fetch", fetchMock);

    const voices = await listVoices("k");

    expect(voices.map((v) => [v.voiceId, v.source])).toEqual([["c1", "account"], ["lib1", "library"]]);
    expect(voices[1]).toMatchObject({ publicOwnerId: "o1", previewUrl: "https://x/id.mp3", description: "young, conversational" });
    expect(fetchMock.mock.calls.map((c) => c[0])).toContain(
      "https://api.elevenlabs.io/v1/shared-voices?language=id&gender=female&page_size=50"
    );
  });
});

describe("addLibraryVoice", () => {
  it("adds the library voice to the account and returns its id", async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () => Response.json({ voice_id: "added1" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(addLibraryVoice("k", "o1", "lib1", "Rara — Putri")).resolves.toBe("added1");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.elevenlabs.io/v1/voices/add/o1/lib1");
  });
});
