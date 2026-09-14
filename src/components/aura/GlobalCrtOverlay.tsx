import React from "react";
import { motion } from "framer-motion";

export function GlobalCrtOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {/* Scanlines */}
      <div
        className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))]"
        style={{
          backgroundSize: "100% 4px, 3px 100%",
          zIndex: 1,
        }}
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.3)_100%)] z-0" />
    </div>
  );
}
