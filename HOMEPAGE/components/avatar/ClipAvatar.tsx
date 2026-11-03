"use client";

import { useEffect, useRef, useState } from "react";
import type { AvatarState } from "@/lib/avatarState";
import { pickClip } from "./clips";
import styles from "./avatar.module.css";

const LOOPING: AvatarState[] = ["idle", "listening", "thinking"];
const FADE_MS = 550;

// Two stacked videos with seamless cross-dissolve:
// The front video is raised on top (zIndex: 2), while the outgoing video
// stays underneath at zIndex: 1 with delayed fade-out to prevent flash.
export default function ClipAvatar({ state, clips }: { state: AvatarState; clips: Record<AvatarState, string[]> }) {
  const refs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const [front, setFront] = useState<number | null>(null);
  const frontRef = useRef<number | null>(null);
  const last = useRef<string | null>(null);
  const activeStateRef = useRef<AvatarState | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const show = (s: AvatarState) => {
    // Avoid retriggering if already playing this looping state
    if (activeStateRef.current === s && LOOPING.includes(s) && frontRef.current !== null) {
      return;
    }
    activeStateRef.current = s;

    const back = frontRef.current === 0 ? 1 : 0;
    const v = refs[back].current;
    if (!v) return;

    const next = pickClip(clips[s], last.current);
    last.current = next;

    v.muted = true;
    v.playsInline = true;
    v.loop = LOOPING.includes(s);

    const onCanPlay = () => {
      v.removeEventListener("canplay", onCanPlay);
      const old = frontRef.current;
      frontRef.current = back;
      setFront(back);
      v.play()?.catch(() => {});
      if (old !== null && old !== back) {
        setTimeout(() => refs[old].current?.pause(), FADE_MS);
      }
    };

    v.addEventListener("canplay", onCanPlay);
    v.src = `/avatar/${next}`;
    v.play()?.catch(() => {});
  };

  useEffect(() => {
    refs.forEach((r) => {
      if (r.current) {
        r.current.muted = true;
        r.current.playsInline = true;
      }
    });
    show(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const onEnded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (frontRef.current === null || e.currentTarget !== refs[frontRef.current].current) return;
    if (stateRef.current === "speaking") {
      activeStateRef.current = null;
      show("speaking");
    }
  };

  return (
    <div className={styles.root} data-state={state}>
      {/* A 74 KB still of the same frame shows at once and fades out when the first clip can play. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.video}
        src="/avatar/placeholder.jpg"
        alt=""
        aria-hidden="true"
        style={{ opacity: front === null ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
      />
      {refs.map((r, i) => (
        <video
          key={i}
          ref={r}
          data-front={i === front}
          className={styles.video}
          style={{ opacity: i === front ? 1 : 0 }}
          muted
          playsInline
          autoPlay
          onEnded={onEnded}
        />
      ))}
    </div>
  );
}
