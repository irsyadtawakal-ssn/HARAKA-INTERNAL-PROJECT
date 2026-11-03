"use client";

import { useEffect, useState } from "react";
import type { AvatarState } from "@/lib/avatarState";
import { parseManifest, type ClipManifest } from "./clips";
import PlaceholderAvatar from "./PlaceholderAvatar";
import ClipAvatar from "./ClipAvatar";

export type AvatarProps = { state: AvatarState; audioLevel: number };

export default function Avatar({ state, audioLevel }: AvatarProps) {
  const [manifest, setManifest] = useState<ClipManifest>({ mode: "placeholder" });

  useEffect(() => {
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
