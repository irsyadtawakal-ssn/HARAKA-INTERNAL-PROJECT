"use client";

import { useEffect, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";

// Soft Skin palette: cream, blush and dusty rose drifting slowly like satin.
const COLORS = ["#efe4e1", "#dcc8c5", "#f6eeeb", "#d4b0ae"];

export default function Backdrop() {
  const [still, setStill] = useState(false);
  const [small, setSmall] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(max-width: 900px)");
    const sync = () => { setStill(motion.matches); setSmall(phone.matches); };
    sync();
    motion.addEventListener("change", sync);
    phone.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      phone.removeEventListener("change", sync);
    };
  }, []);

  return (
    <div className="backdrop" aria-hidden="true">
      <MeshGradient
        style={{ width: "100%", height: "100%" }}
        colors={COLORS}
        distortion={0.85}
        swirl={0.15}
        grainMixer={0}
        grainOverlay={0.12}
        speed={still ? 0 : 0.18}
        // The gradient is soft, so a low resolution looks the same and saves battery on phones.
        maxPixelCount={small ? 400_000 : 1_200_000}
      />
    </div>
  );
}
