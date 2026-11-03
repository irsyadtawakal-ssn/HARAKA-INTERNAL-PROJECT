"use client";

import { useEffect } from "react";
import Avatar from "@/components/avatar/Avatar";
import Conversation from "@/components/Conversation";
import { useConversation } from "@/lib/controller";

export default function RaraApp() {
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
    <>
      <section className="stage">
        <div className="avatar-slot">
          <Avatar state={conv.state} audioLevel={conv.audioLevel} />
        </div>
      </section>
      <section className="bottom">
        <Conversation conv={conv} />
      </section>
    </>
  );
}
