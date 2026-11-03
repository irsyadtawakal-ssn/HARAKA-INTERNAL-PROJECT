"use client";

import { useEffect, useState } from "react";
import type { AvatarState } from "@/lib/avatarState";
import { parseManifest, type ClipManifest } from "./clips";
import PlaceholderAvatar from "./PlaceholderAvatar";
import ClipAvatar from "./ClipAvatar";

export type AvatarProps = { state: AvatarState; audioLevel: number };

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

/** Data saver or a 2G/3G link: the looping clips would eat the visitor's quota, so keep the still avatar. */
function prefersStill(): boolean {
  const net = (navigator as Navigator & { connection?: NetworkInfo }).connection;
  return Boolean(net?.saveData) || ["slow-2g", "2g", "3g"].includes(net?.effectiveType ?? "");
}

export default function Avatar({ state, audioLevel }: AvatarProps) {
  const [manifest, setManifest] = useState<ClipManifest>({ mode: "placeholder" });

  useEffect(() => {
    if (prefersStill()) return;
    fetch(`/avatar/manifest.json?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setManifest(parseManifest(j)))
      .catch(() => setManifest({ mode: "placeholder" }));
  }, []);

  return manifest.mode === "clips" ? (
    <ClipAvatar state={state} clips={manifest.clips} />
  ) : (
    <PlaceholderAvatar state={state} audioLevel={audioLevel} />
  );
}
