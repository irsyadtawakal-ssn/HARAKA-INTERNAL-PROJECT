"use client";

import { useEffect, useState, type MutableRefObject } from "react";
import type { AvatarState } from "@/lib/avatarState";
import { parseManifest, type ClipManifest } from "./clips";
import PlaceholderAvatar from "./PlaceholderAvatar";
import ClipAvatar from "./ClipAvatar";
import { AVATARS, DEFAULT_AVATAR, type AvatarProfile } from "@/lib/avatars";

/** Lets the page start the greeting clip straight from a tap handler, which is what unmuted playback needs. */
export type GreetingPlayer = { play(): boolean };

export type AvatarProps = {
  state: AvatarState;
  audioLevel: number;
  profile?: AvatarProfile;
  greetingRef?: MutableRefObject<GreetingPlayer | null>;
  voiceOn?: boolean;
  onGreetingEnd?: () => void;
  /** The greeting clip is buffered and can start right away. */
  onGreetingReady?: () => void;
  /** Whether the browser let the greeting play with sound, or only muted (no tap yet). */
  onGreetingPlayback?: (mode: "sound" | "muted") => void;
};

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

/** Data saver or a 2G/3G link: the looping clips would eat the visitor's quota, so keep the still avatar. */
function prefersStill(): boolean {
  const net = (navigator as Navigator & { connection?: NetworkInfo }).connection;
  return Boolean(net?.saveData) || ["slow-2g", "2g", "3g"].includes(net?.effectiveType ?? "");
}

export default function Avatar({ state, audioLevel, profile = AVATARS[DEFAULT_AVATAR], greetingRef, voiceOn = true, onGreetingEnd, onGreetingReady, onGreetingPlayback }: AvatarProps) {
  const { base } = profile;
  // Tagged with the folder it came from, so a switch never plays one avatar's clip list from the other's folder.
  const [loaded, setLoaded] = useState<{ base: string; manifest: ClipManifest } | null>(null);
  const manifest: ClipManifest = loaded?.base === base ? loaded.manifest : { mode: "placeholder" };

  useEffect(() => {
    if (prefersStill()) return;
    fetch(`${base}/manifest.json?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setLoaded({ base, manifest: parseManifest(j) }))
      .catch(() => setLoaded({ base, manifest: { mode: "placeholder" } }));
  }, [base]);

  return manifest.mode === "clips" ? (
    <ClipAvatar
      key={base}
      state={state}
      clips={manifest.clips}
      base={base}
      greeting={manifest.greeting}
      greetingRef={greetingRef}
      voiceOn={voiceOn}
      onGreetingEnd={onGreetingEnd}
      onGreetingReady={onGreetingReady}
      onGreetingPlayback={onGreetingPlayback}
    />
  ) : (
    <PlaceholderAvatar state={state} audioLevel={audioLevel} profile={profile} />
  );
}
