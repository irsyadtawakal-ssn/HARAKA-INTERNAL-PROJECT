"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { AvatarState } from "@/lib/avatarState";
import type { GreetingPlayer } from "./Avatar";
import { pickClip } from "./clips";
import styles from "./avatar.module.css";

const LOOPING: AvatarState[] = ["idle", "listening", "thinking"];
const FADE_MS = 550;

// Two stacked videos with seamless cross-dissolve:
// The front video is raised on top (zIndex: 2), while the outgoing video
// stays underneath at zIndex: 1 with delayed fade-out to prevent flash.
type Props = {
  state: AvatarState;
  clips: Record<AvatarState, string[]>;
  base?: string;
  greeting?: string;
  greetingRef?: MutableRefObject<GreetingPlayer | null>;
  voiceOn?: boolean;
  onGreetingEnd?: () => void;
};

export default function ClipAvatar({ state, clips, base = "/avatar", greeting, greetingRef, voiceOn = true, onGreetingEnd }: Props) {
  const refs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  // The greeting clip carries its own voice, so it plays unmuted on a third, preloaded video above the loop.
  const greetVideo = useRef<HTMLVideoElement>(null);
  const [greetingOn, setGreetingOn] = useState(false);
  const greetingLive = useRef(false);
  const onGreetingEndRef = useRef(onGreetingEnd);
  onGreetingEndRef.current = onGreetingEnd;
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;
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
    v.src = `${base}/${next}`;
    v.play()?.catch(() => {});
  };

  const endGreeting = (notify: boolean) => {
    if (!greetingLive.current) return;
    greetingLive.current = false;
    greetVideo.current?.pause();
    setGreetingOn(false);
    if (notify) onGreetingEndRef.current?.();
  };

  useEffect(() => {
    if (!greetingRef) return;
    greetingRef.current = greeting
      ? {
          play: () => {
            const v = greetVideo.current;
            // Not buffered yet (a very fast first tap): let the caller fall back to the spoken TTS greeting.
            if (!v || v.readyState < 3) return false;
            v.muted = !voiceOnRef.current;
            v.currentTime = 0;
            greetingLive.current = true;
            setGreetingOn(true);
            v.play()?.catch(() => endGreeting(true));
            return true;
          },
        }
      : null;
    return () => {
      greetingRef.current = null;
      // Switching avatar mid-greeting: tell the page it is over so the avatar does not stay "speaking".
      endGreeting(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting, greetingRef]);

  // Muting mid-greeting silences it; the visitor asking or tapping the mic cuts it short.
  useEffect(() => {
    if (greetVideo.current) greetVideo.current.muted = !voiceOn;
  }, [voiceOn]);

  useEffect(() => {
    if (greetingLive.current && state !== "speaking") endGreeting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    refs.forEach((r) => {
      if (r.current) {
        r.current.muted = true;
        r.current.playsInline = true;
      }
    });
    // While the greeting covers the loop, its "speaking" is the greeting itself; the loop stays where it is.
    if (greetingLive.current) return;
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
        src={`${base}/placeholder.jpg`}
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
      {greeting && (
        <video
          ref={greetVideo}
          className={styles.video}
          src={`${base}/${greeting}`}
          style={{ opacity: greetingOn ? 1 : 0, zIndex: 3, transition: `opacity ${FADE_MS}ms ease` }}
          preload="auto"
          playsInline
          onEnded={() => endGreeting(true)}
        />
      )}
    </div>
  );
}
