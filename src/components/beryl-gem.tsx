"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

interface BerylGemProps {
  className?: string;
  size?: number;
  interactive?: boolean;
}

export function BerylGem({
  className = "",
  size = 140,
  interactive = true,
}: BerylGemProps) {
  const shouldReduceMotion = useReducedMotion();

  // Regular hexagon coordinates centered at (100, 100) with radius R = 75
  // Vertices around the perimeter (angles 30, 90, 150, 210, 270, 330 deg):
  // Center is (100, 100)
  // Vertex 0 (Top-Right): (100 + 75*cos(30), 100 - 75*sin(30)) = (164.95, 62.5)
  // Vertex 1 (Bottom-Right): (100 + 75*cos(330), 100 - 75*sin(330)) = (164.95, 137.5) -> let's do standard top-point or flat-top
  // In the mockup:
  // Top vertex: (100, 25)
  // Top-Right: (165, 62.5)
  // Bottom-Right: (165, 137.5)
  // Bottom vertex: (100, 175)
  // Bottom-Left: (35, 137.5)
  // Top-Left: (35, 62.5)
  // Center vertex: (100, 100)
  // 6 triangular facets sharing the center vertex (100, 100):
  // 1. Top-Right facet: (100,25) -> (165,62.5) -> (100,100)
  // 2. Right facet: (165,62.5) -> (165,137.5) -> (100,100)
  // 3. Bottom-Right facet: (165,137.5) -> (100,175) -> (100,100)
  // 4. Bottom-Left facet: (100,175) -> (35,137.5) -> (100,100)
  // 5. Left facet: (35,137.5) -> (35,62.5) -> (100,100)
  // 6. Top-Left facet: (35,62.5) -> (100,25) -> (100,100)

  // 6 distinct facet shades from Beryl palette:
  const facets = [
    { points: "100,25 165,62.5 100,100", fill: "#76ECC3", name: "facet-tr-light" },
    { points: "165,62.5 165,137.5 100,100", fill: "#3EE0A8", name: "facet-r-bright" },
    { points: "165,137.5 100,175 100,100", fill: "#1DA87F", name: "facet-br-mid" },
    { points: "100,175 35,137.5 100,100", fill: "#0B7A5A", name: "facet-bl-deep" },
    { points: "35,137.5 35,62.5 100,100", fill: "#138D69", name: "facet-l-dark" },
    { points: "35,62.5 100,25 100,100", fill: "#2EC496", name: "facet-tl-emerald" },
  ];

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Soft emerald ambient glow aura */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-40 dark:opacity-60 bg-radial from-[#3EE0A8] via-[#0B7A5A]/30 to-transparent pointer-events-none transition-opacity"
        style={{ transform: "scale(1.4)" }}
      />

      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-xl"
        animate={
          shouldReduceMotion || !interactive
            ? undefined
            : {
                y: [0, -6, 0],
                rotateZ: [0, 1.5, 0, -1.5, 0],
              }
        }
        transition={
          shouldReduceMotion || !interactive
            ? undefined
            : {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
        whileHover={interactive ? { scale: 1.08, rotateZ: 5 } : undefined}
      >
        <defs>
          <filter id="beryl-gem-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0B7A5A" floodOpacity="0.25" />
          </filter>
        </defs>

        <g filter="url(#beryl-gem-shadow)">
          {facets.map((facet, idx) => (
            <polygon
              key={idx}
              points={facet.points}
              fill={facet.fill}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="0.8"
              strokeLinejoin="round"
              className="transition-opacity hover:opacity-90"
            />
          ))}

          {/* Facet internal subtle specular highlight lines */}
          <line x1="100" y1="25" x2="100" y2="100" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="165" y1="62.5" x2="100" y2="100" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
          <line x1="165" y1="137.5" x2="100" y2="100" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
          <line x1="100" y1="175" x2="100" y2="100" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
          <line x1="35" y1="137.5" x2="100" y2="100" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
          <line x1="35" y1="62.5" x2="100" y2="100" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
        </g>
      </motion.svg>
    </div>
  );
}

export function BerylLogo({
  className = "",
  size = 28,
  showText = true,
}: {
  className?: string;
  size?: number;
  showText?: boolean;
}) {
  return (
    <div className={`inline-flex items-center gap-2.5 font-bold tracking-tight ${className}`}>
      <BerylGem size={size} interactive={false} />
      {showText && (
        <span className="font-heading text-lg tracking-wider font-extrabold text-[#07100D] dark:text-[#EDF5F2]">
          BERYL
        </span>
      )}
    </div>
  );
}
