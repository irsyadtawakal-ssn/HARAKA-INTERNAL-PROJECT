import { applyPronunciationDictionary, getRaraConfig, type RaraConfig } from "./raraConfig";

export type VoiceOverride = Partial<RaraConfig["voice"]>;

export async function synthesize(rawText: string, override?: VoiceOverride): Promise<ArrayBuffer> {
  const isTest = process.env.NODE_ENV === "test";
  const cfg = isTest ? undefined : getRaraConfig().voice;
  const provider = override?.provider ?? cfg?.provider ?? "elevenlabs";
  if (provider === "browser") {
    throw new Error("browser_tts_selected");
  }

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
  const modelId = override?.modelId || cfg?.modelId || process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

  if (!apiKey || !voiceId) {
    throw new Error("ElevenLabs is not configured");
  }

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
  if (!res.ok) throw new Error(`ElevenLabs failed: ${res.status}`);
  return res.arrayBuffer();
}
