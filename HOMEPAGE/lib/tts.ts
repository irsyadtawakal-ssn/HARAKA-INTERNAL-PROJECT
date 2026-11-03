import { applyPronunciationDictionary, getRaraConfig, type RaraConfig } from "./raraConfig";

export type VoiceOverride = Partial<RaraConfig["voice"]>;

export async function synthesize(rawText: string, override?: VoiceOverride): Promise<ArrayBuffer> {
  const isTest = process.env.NODE_ENV === "test";
  const cfg = isTest ? undefined : getRaraConfig().voice;
  const rules = override?.pronunciationDictionary ?? cfg?.pronunciationDictionary ?? [];
  const text = applyPronunciationDictionary(rawText, rules);

  const apiKey =
    override?.elevenlabsApiKey && override.elevenlabsApiKey !== "***MASKED***"
      ? override.elevenlabsApiKey
      : cfg?.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY || "";
  const voiceId =
    override?.voiceId ||
    (isTest ? process.env.ELEVENLABS_VOICE_ID : cfg?.voiceId || process.env.ELEVENLABS_VOICE_ID) ||
    "";
  const modelId = override?.modelId || cfg?.modelId || process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5";

  if (!apiKey) throw new Error("API Key ElevenLabs belum diisi");
  if (!voiceId) throw new Error("Voice ID belum dipilih");

  const stability = Math.max(0, Math.min(1, (override?.stability ?? cfg?.stability ?? 75) / 100));
  const similarity_boost = Math.max(0, Math.min(1, (override?.similarityBoost ?? cfg?.similarityBoost ?? 85) / 100));
  const style = Math.max(0, Math.min(1, (override?.styleExaggeration ?? cfg?.styleExaggeration ?? 20) / 100));
  const use_speaker_boost = override?.useSpeakerBoost ?? cfg?.useSpeakerBoost ?? true;
  const speed = Math.max(0.7, Math.min(1.2, override?.speakingSpeed ?? cfg?.speakingSpeed ?? 1.05));

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "xi-api-key": apiKey,
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost,
          style,
          use_speaker_boost,
          speed,
        },
      }),
    }
  );
  if (!res.ok) throw await elevenLabsError(res);
  return res.arrayBuffer();
}

/** Error carrying ElevenLabs' own reason (e.g. "invalid_api_key", "quota_exceeded") instead of a bare status. */
async function elevenLabsError(res: Response): Promise<Error> {
  const text = await res.text().catch(() => "");
  let detail = text.slice(0, 300);
  try {
    const d = JSON.parse(text)?.detail;
    detail = typeof d === "string" ? d : d?.message || d?.status || detail;
  } catch {
    // body is not JSON, keep the raw text
  }
  return new Error(`ElevenLabs gagal: ${res.status}${detail ? ` — ${detail}` : ""}`);
}

export type ElevenLabsVoice = { voiceId: string; name: string; category: string; description: string; previewUrl: string };

/** Voices in the ElevenLabs account: premade ones plus clones and voices added from the Voice Library. */
export async function listVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  if (!apiKey) throw new Error("API Key ElevenLabs belum diisi");
  const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": apiKey } });
  if (!res.ok) throw await elevenLabsError(res);
  const json = await res.json();
  const voices: Record<string, unknown>[] = Array.isArray(json?.voices) ? json.voices : [];
  return voices
    .map((v) => {
      const labels = (v.labels && typeof v.labels === "object" ? v.labels : {}) as Record<string, string>;
      return {
        voiceId: String(v.voice_id ?? ""),
        name: String(v.name ?? ""),
        category: String(v.category ?? ""),
        description: [labels.gender, labels.age, labels.accent, labels.use_case ?? labels["use case"]].filter(Boolean).join(", "),
        previewUrl: String(v.preview_url ?? ""),
      };
    })
    .filter((v) => v.voiceId)
    .sort((a, b) => Number(a.category === "premade") - Number(b.category === "premade") || a.name.localeCompare(b.name));
}
