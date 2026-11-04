"use client";

import { useEffect, useState } from "react";
import type { AvatarState } from "@/lib/avatarState";
import styles from "./avatar.module.css";
import { AVATARS, DEFAULT_AVATAR, type AvatarProfile } from "@/lib/avatars";

export default function PlaceholderAvatar({ state, audioLevel, profile = AVATARS[DEFAULT_AVATAR] }: { state: AvatarState; audioLevel: number; profile?: AvatarProfile }) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 120);
        schedule();
      }, 3000 + Math.random() * 3000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  const ringScale = state === "speaking" ? 1 + Math.min(audioLevel, 1) * 0.12 : 1;

  return (
    <div className={styles.root} data-state={state}>
      <div className={styles.ring} style={{ transform: `translate(-50%, -50%) scale(${ringScale})` }} />
      <div className={styles.head}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.face} src={`${profile.base}/placeholder.png`} alt={`${profile.name}, asisten AI Haraka Erfi`} />
        <div className={styles.lids} data-blink={blink} />
      </div>
    </div>
  );
}
