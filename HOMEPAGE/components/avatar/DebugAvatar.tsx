"use client";

import { useEffect, useState } from "react";
import type { AvatarState } from "@/lib/avatarState";
import Avatar from "./Avatar";

const CYCLE: AvatarState[] = ["idle", "listening", "thinking", "speaking"];

// Dev-only preview: open /?debugAvatar=1 to cycle through the four states.
export default function DebugAvatar() {
  const [i, setI] = useState(0);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % CYCLE.length), 3000);
    const l = setInterval(() => setLevel(Math.random()), 120);
    return () => { clearInterval(t); clearInterval(l); };
  }, []);

  return (
    <>
      <Avatar state={CYCLE[i]} audioLevel={level} />
      <p style={{ position: "absolute", bottom: -28, width: "100%", textAlign: "center", fontSize: 12 }}>debug: {CYCLE[i]}</p>
    </>
  );
}
