import type { AvatarState } from "@/lib/avatarState";

export type ClipManifest =
  | { mode: "placeholder" }
  | { mode: "clips"; clips: Record<AvatarState, string[]> };

const STATES: AvatarState[] = ["idle", "listening", "thinking", "speaking"];

export function parseManifest(json: unknown): ClipManifest {
  const m = json as { mode?: unknown; clips?: Record<string, unknown> } | null;
  if (m?.mode !== "clips" || !m.clips) return { mode: "placeholder" };
  const ok = STATES.every(
    (s) => Array.isArray(m.clips![s]) && (m.clips![s] as unknown[]).length > 0 && (m.clips![s] as unknown[]).every((c) => typeof c === "string"),
  );
  return ok ? { mode: "clips", clips: m.clips as Record<AvatarState, string[]> } : { mode: "placeholder" };
}

export function pickClip(list: string[], previous: string | null, rnd: () => number = Math.random): string {
  const pool = list.length > 1 ? list.filter((c) => c !== previous) : list;
  return pool[Math.floor(rnd() * pool.length)];
}
