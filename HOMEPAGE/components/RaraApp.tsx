"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import Avatar, { type GreetingPlayer } from "@/components/avatar/Avatar";
import Conversation from "@/components/Conversation";
import { useConversation } from "@/lib/controller";
import type { WhatsAppContact } from "@/components/WhatsAppCta";
import type { ProductCategory } from "@/components/ProductCard";
import { AVATARS, DEFAULT_AVATAR, isAvatarId, type AvatarId } from "@/lib/avatars";

const AVATAR_KEY = "avatar-choice";

type Props = {
  whatsapp: WhatsAppContact;
  products?: ProductCategory[];
  /** Opening line per avatar, set in the dashboard; an empty one falls back to the built-in hello. */
  greetings?: Partial<Record<AvatarId, string>>;
};

export default function RaraApp({ whatsapp, products, greetings }: Props) {
  const [avatar, setAvatar] = useState<AvatarId>(DEFAULT_AVATAR);
  const conv = useConversation(avatar, greetings?.[avatar] || undefined);

  // The visitor's pick is a per-device preference; read it after mount so server and client render the same first frame.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AVATAR_KEY);
      if (isAvatarId(saved)) setAvatar(saved);
    } catch {
      // Storage blocked: stay on the default avatar.
    }
  }, []);

  const pickAvatar = (id: AvatarId) => {
    setAvatar(id);
    try {
      localStorage.setItem(AVATAR_KEY, id);
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
  };

  // The greeting clip starts as soon as it is buffered. Browsers usually allow it only muted until the visitor
  // taps, so she greets on screen at once and the first tap replays it with her voice.
  const [gestured, setGestured] = useState(false);
  const gesturedRef = useRef(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const soundBlockedRef = useRef(false);
  const [heard, setHeard] = useState(false);
  const autoTried = useRef(false);
  const greetingPlayer = useRef<GreetingPlayer | null>(null);
  const playGreetingClip = () => greetingPlayer.current?.play() ?? false;

  const onGreetingReady = () => {
    if (gesturedRef.current || autoTried.current) return;
    autoTried.current = true;
    void conv.greet(playGreetingClip);
  };
  const onGreetingPlayback = (mode: "sound" | "muted") => {
    soundBlockedRef.current = mode === "muted";
    setSoundBlocked(mode === "muted");
    if (mode === "sound") setHeard(true);
    // Still no sound after a tap: keep the "tap to hear" pill up so the next tap can try again.
    if (mode === "muted") {
      gesturedRef.current = false;
      setGestured(false);
    }
  };

  useEffect(() => {
    const mark = () => {
      conv.userGestured();
      if (gesturedRef.current) return;
      gesturedRef.current = true;
      setGestured(true);
      if (soundBlockedRef.current) {
        soundBlockedRef.current = false;
        setSoundBlocked(false);
        void conv.greet(playGreetingClip, { replay: true });
      } else {
        void conv.greet(playGreetingClip);
      }
    };
    // Only these events count as a user activation that lets media play with sound. A finger's pointerdown does
    // not (that is why phones stayed silent): on touch screens the permission arrives with touchend.
    const events = ["touchend", "click", "keydown"] as const;
    events.forEach((ev) => window.addEventListener(ev, mark, { once: true, passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, mark));
  }, [conv]);

  // Switching avatar before asking anything: the new one introduces herself in her own voice.
  const { greet } = conv;
  useEffect(() => {
    // The new avatar's clip list is still loading here, so this one is spoken with TTS.
    if (gesturedRef.current) void greet();
  }, [avatar, greet]);

  const asked = conv.thread.some((m) => m.role === "user");

  return (
    <div className="studio">
      <section className="stage">
        <div className="avatar-slot">
          <Avatar
            state={conv.state}
            audioLevel={conv.audioLevel}
            profile={AVATARS[avatar]}
            greetingRef={greetingPlayer}
            voiceOn={conv.voiceOn}
            onGreetingEnd={conv.greetEnded}
            onGreetingReady={onGreetingReady}
            onGreetingPlayback={onGreetingPlayback}
          />
        </div>
        {!gestured && !heard && conv.voiceOn && !asked && (
          // Any tap counts; this pill only tells the visitor that one is needed before the avatar can speak.
          <button type="button" className="greet-hint">
            <Volume2 size={15} aria-hidden="true" />{" "}
            {soundBlocked ? `Ketuk untuk dengar ${AVATARS[avatar].name}` : `Ketuk untuk disapa ${AVATARS[avatar].name}`}
          </button>
        )}
      </section>
      <section className="chat-slot">
        <Conversation conv={conv} whatsapp={whatsapp} products={products} avatar={avatar} onAvatarChange={pickAvatar} />
      </section>
    </div>
  );
}
