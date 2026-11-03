"use client";

import { useEffect } from "react";
import Avatar from "@/components/avatar/Avatar";
import Conversation from "@/components/Conversation";
import { useConversation } from "@/lib/controller";
import type { WhatsAppContact } from "@/components/WhatsAppCta";
import type { ProductCategory } from "@/components/ProductCard";

export default function RaraApp({ whatsapp, products }: { whatsapp: WhatsAppContact; products?: ProductCategory[] }) {
  const conv = useConversation();

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
          <Avatar state={conv.state} audioLevel={conv.audioLevel} />
        </div>
      </section>
      <section className="chat-slot">
        <Conversation conv={conv} whatsapp={whatsapp} products={products} />
      </section>
    </div>
  );
}
