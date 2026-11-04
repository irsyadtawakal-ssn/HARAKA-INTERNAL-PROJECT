"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/avatar/Avatar";
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

  // Browsers only allow audio after a user gesture; remember the first one.
  useEffect(() => {
    const mark = () => conv.userGestured();
    window.addEventListener("pointerdown", mark, { once: true });
    window.addEventListener("keydown", mark, { once: true });
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
    };
  }, [conv]);

  return (
    <div className="studio">
      <section className="stage">
        <div className="avatar-slot">
          <Avatar state={conv.state} audioLevel={conv.audioLevel} profile={AVATARS[avatar]} />
        </div>
      </section>
      <section className="chat-slot">
        <Conversation conv={conv} whatsapp={whatsapp} products={products} avatar={avatar} onAvatarChange={pickAvatar} />
      </section>
    </div>
  );
}
