import { applyPronunciationDictionary, getRaraConfig, type RaraConfig } from "./raraConfig";
import { forAvatar } from "./avatarProfile";
import type { AvatarId } from "./avatars";

export type VoiceOverride = Partial<RaraConfig["voice"]>;

/** `avatar` picks whose saved voice to use (Mira's or Rara's); without it the top-level (Rara) voice is used. */
export async function synthesize(rawText: string, override?: VoiceOverride, avatar: AvatarId = "rara"): Promise<ArrayBuffer> {
  const isTest = process.env.NODE_ENV === "test";
  const cfg = isTest ? undefined : forAvatar(getRaraConfig(), avatar).voice;
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

export type ElevenLabsVoice = {
  voiceId: string;
  name: string;
  description: string;
  previewUrl: string;
  /** "account" voices can be used right away; "library" voices must be added to the account first. */
  source: "account" | "library";
  publicOwnerId?: string;
};

const labelsOf = (v: Record<string, unknown>) =>
  (v.labels && typeof v.labels === "object" ? v.labels : {}) as Record<string, string>;

/** The account's own voices (clones, designs, Voice Library voices already added); ElevenLabs' English premade set is left out. */
async function accountVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": apiKey } });
  if (!res.ok) throw await elevenLabsError(res);
  const json = await res.json();
  const voices: Record<string, unknown>[] = Array.isArray(json?.voices) ? json.voices : [];
  return voices
    .filter((v) => v.voice_id && v.category !== "premade")
    .map((v) => {
      const l = labelsOf(v);
      return {
        voiceId: String(v.voice_id),
        name: String(v.name ?? ""),
        description: [l.gender, l.age, l.accent, l.language].filter(Boolean).join(", "),
        previewUrl: String(v.preview_url ?? ""),
        source: "account" as const,
      };
    });
}

/** Indonesian female voices from the public ElevenLabs Voice Library. */
async function libraryVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  const res = await fetch("https://api.elevenlabs.io/v1/shared-voices?language=id&gender=female&page_size=50", {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) throw await elevenLabsError(res);
  const json = await res.json();
  const voices: Record<string, unknown>[] = Array.isArray(json?.voices) ? json.voices : [];
  return voices
    .filter((v) => v.voice_id && v.public_owner_id)
    .map((v) => {
      const verified = Array.isArray(v.verified_languages) ? (v.verified_languages as Record<string, string>[]) : [];
      const idPreview = verified.find((l) => l.language === "id" && l.preview_url)?.preview_url;
      return {
        voiceId: String(v.voice_id),
        name: String(v.name ?? ""),
        description: [v.age, v.accent, v.use_case].filter(Boolean).map(String).join(", ").replace(/_/g, " "),
        previewUrl: String(idPreview || v.preview_url || ""),
        source: "library" as const,
        publicOwnerId: String(v.public_owner_id),
      };
    });
}

/** Voices Rara can use: the account's own ones first, then Indonesian female voices from the Voice Library. */
export async function listVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  if (!apiKey) throw new Error("API Key ElevenLabs belum diisi");
  const [own, library] = await Promise.all([accountVoices(apiKey), libraryVoices(apiKey)]);
  const ownIds = new Set(own.map((v) => v.voiceId));
  return [
    ...own.sort((a, b) => a.name.localeCompare(b.name)),
    ...library.filter((v) => !ownIds.has(v.voiceId)),
  ];
}

/** Adds a Voice Library voice to the account (required before text-to-speech can use it); returns its voice id. */
export async function addLibraryVoice(apiKey: string, publicOwnerId: string, voiceId: string, name: string): Promise<string> {
  if (!apiKey) throw new Error("API Key ElevenLabs belum diisi");
  const res = await fetch(
    `https://api.elevenlabs.io/v1/voices/add/${encodeURIComponent(publicOwnerId)}/${encodeURIComponent(voiceId)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify({ new_name: name }),
    }
  );
  if (!res.ok) throw await elevenLabsError(res);
  const json = await res.json();
  return String(json?.voice_id || voiceId);
}
