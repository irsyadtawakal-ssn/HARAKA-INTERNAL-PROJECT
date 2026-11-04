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

  // Browsers only allow audio after a user gesture; the first one unlocks it and the avatar says hello.
  const [gestured, setGestured] = useState(false);
  const gesturedRef = useRef(false);
  const greetingPlayer = useRef<GreetingPlayer | null>(null);
  const playGreetingClip = () => greetingPlayer.current?.play() ?? false;
  useEffect(() => {
    const mark = () => {
      conv.userGestured();
      if (gesturedRef.current) return;
      gesturedRef.current = true;
      setGestured(true);
      void conv.greet(playGreetingClip);
    };
    window.addEventListener("pointerdown", mark, { once: true });
    window.addEventListener("keydown", mark, { once: true });
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
    };
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
          />
        </div>
        {!gestured && conv.voiceOn && !asked && (
          // Any tap counts; this pill only tells the visitor that one is needed before the avatar can speak.
          <button type="button" className="greet-hint">
            <Volume2 size={15} aria-hidden="true" /> Ketuk untuk disapa {AVATARS[avatar].name}
          </button>
        )}
      </section>
      <section className="chat-slot">
        <Conversation conv={conv} whatsapp={whatsapp} products={products} avatar={avatar} onAvatarChange={pickAvatar} />
      </section>
    </div>
  );
}
