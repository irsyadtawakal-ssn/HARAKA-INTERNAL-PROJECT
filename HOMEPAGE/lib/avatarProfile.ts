import type { RaraConfig } from "./raraConfig";
import type { AvatarId } from "./avatars";

// Kept per avatar. Everything else (knowledge, guardrails, lead rules, LLM, the ElevenLabs key and the
// pronunciation dictionary) is one company-wide set that Mira and Rara share.
export const PROFILE_VOICE_KEYS = [
  "voiceId",
  "modelId",
  "stability",
  "similarityBoost",
  "styleExaggeration",
  "useSpeakerBoost",
  "speakingSpeed",
  "sampleTestText",
] as const;

export type ProfileVoice = Pick<RaraConfig["voice"], (typeof PROFILE_VOICE_KEYS)[number]>;
export type AvatarProfileConfig = { persona: RaraConfig["persona"]; voice: ProfileVoice; greeting: string };

export function pickProfileVoice(voice: RaraConfig["voice"]): ProfileVoice {
  return Object.fromEntries(PROFILE_VOICE_KEYS.map((k) => [k, voice[k]])) as ProfileVoice;
}

const toMira = (s: string) => s.replace(/\bRara\b/g, "Mira");

/** Mira's starting point before anyone edits her: Rara's settings with the name swapped. */
export function deriveMiraProfile(cfg: RaraConfig): AvatarProfileConfig {
  const p = cfg.persona;
  const voice = pickProfileVoice(cfg.voice);
  return {
    persona: {
      ...p,
      avatarName: "Mira",
      roleTitle: toMira(p.roleTitle),
      toneOfVoice: toMira(p.toneOfVoice),
      customSystemPromptOverride: toMira(p.customSystemPromptOverride),
    },
    voice: { ...voice, sampleTestText: toMira(voice.sampleTestText) },
    greeting: toMira(cfg.visual.greeting),
  };
}

/** Saved Mira settings over the derived defaults, so fields added later still get a value. */
export function mergeMiraProfile(raw: Partial<AvatarProfileConfig> | undefined, cfg: RaraConfig): AvatarProfileConfig {
  const base = deriveMiraProfile(cfg);
  return {
    persona: { ...base.persona, ...(raw?.persona || {}) },
    voice: { ...base.voice, ...(raw?.voice || {}) },
    greeting: raw?.greeting || base.greeting,
  };
}

/**
 * Puts Mira's persona, voice and greeting in the top-level slots and parks Rara's under `mira`.
 * Swapping twice gives the original back, which is how the dashboard edits either avatar with the same form.
 */
export function swapMira(cfg: RaraConfig): RaraConfig {
  const mira = cfg.mira ?? deriveMiraProfile(cfg);
  return {
    ...cfg,
    persona: mira.persona,
    voice: { ...cfg.voice, ...mira.voice },
    visual: { ...cfg.visual, greeting: mira.greeting },
    mira: { persona: cfg.persona, voice: pickProfileVoice(cfg.voice), greeting: cfg.visual.greeting },
  };
}

/** The config as the chosen avatar sees it: top-level persona, voice and greeting are that avatar's. */
export const forAvatar = (cfg: RaraConfig, id: AvatarId): RaraConfig => (id === "mira" ? swapMira(cfg) : cfg);
