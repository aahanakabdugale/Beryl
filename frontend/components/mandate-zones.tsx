"use client";

import React from "react";
import { BerylLogo } from "@/components/beryl-logo";

export function MandateZonesInfographic({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full select-none ${className}`}>
      <svg
        viewBox="0 0 760 420"
        className="w-full h-auto block overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle Radial Glow for Inner Zone */}
          <radialGradient id="inner-zone-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.14" />
            <stop offset="70%" stopColor="#10B981" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>

          {/* Subtle Radial Glow for Middle Zone */}
          <radialGradient id="middle-zone-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.09" />
            <stop offset="85%" stopColor="#F59E0B" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Top-Left Title: MANDATE ZONES */}
        <text
          x="20"
          y="32"
          className="font-mono text-[11px] font-bold tracking-[0.22em] fill-[#0B7A5A] dark:fill-[#3EE0A8]"
        >
          MANDATE ZONES
        </text>

        {/* 2. Crosshair Center Axes (Seamlessly blended into page grid) */}
        <line
          x1="30"
          y1="210"
          x2="480"
          y2="210"
          className="stroke-[#0B7A5A]/20 dark:stroke-[#3EE0A8]/20"
          strokeWidth="1"
        />
        <line
          x1="270"
          y1="20"
          x2="270"
          y2="400"
          className="stroke-[#0B7A5A]/20 dark:stroke-[#3EE0A8]/20"
          strokeWidth="1"
        />

        {/* 3. Concentric Mandate Zone Circles */}
        {/* Outer Zone: SUSPICIOUS (Radius = 165) */}
        <circle
          cx="270"
          cy="210"
          r="165"
          fill="none"
          stroke="#F43F5E"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          className="opacity-70 dark:opacity-85"
        />
        <text
          x="270"
          y="37"
          textAnchor="middle"
          className="font-mono text-[10.5px] font-bold tracking-widest fill-[#E11D48] dark:fill-[#FB7185]"
        >
          SUSPICIOUS
        </text>

        {/* Middle Zone: ABOVE $30 (Radius = 110) */}
        <circle
          cx="270"
          cy="210"
          r="110"
          fill="url(#middle-zone-glow)"
          stroke="#F59E0B"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          className="opacity-75 dark:opacity-85"
        />
        <text
          x="270"
          y="92"
          textAnchor="middle"
          className="font-mono text-[10.5px] font-bold tracking-widest fill-[#D97706] dark:fill-[#FBBF24]"
        >
          ABOVE $30
        </text>

        {/* Inner Zone: WITHIN $30 (Radius = 55) */}
        <circle
          cx="270"
          cy="210"
          r="55"
          fill="url(#inner-zone-glow)"
          className="stroke-[#059669] dark:stroke-[#3EE0A8]"
          strokeWidth="1.5"
        />
        <text
          x="270"
          y="147"
          textAnchor="middle"
          className="font-mono text-[10.5px] font-bold tracking-widest fill-[#059669] dark:fill-[#3EE0A8]"
        >
          WITHIN $30
        </text>

        {/* 4. Center BERYL Hexagon Gem */}
        <g transform="translate(247, 187)">
          <BerylLogo size={46} />
        </g>

        {/* 5. Connector Lines to Right-Hand Cards */}
        {/* Line 1 -> APPROVED card */}
        <line
          x1="315"
          y1="178"
          x2="495"
          y2="87"
          className="stroke-[#059669] dark:stroke-[#3EE0A8]"
          strokeWidth="1.5"
        />
        <circle
          cx="315"
          cy="178"
          r="4"
          className="fill-[#059669] dark:fill-[#3EE0A8]"
        />

        {/* Line 2 -> ASK YOU FIRST card */}
        <line
          x1="380"
          y1="210"
          x2="495"
          y2="210"
          stroke="#F59E0B"
          strokeWidth="1.5"
        />
        <circle cx="380" cy="210" r="4" fill="#F59E0B" />

        {/* Line 3 -> BLOCKED card */}
        <line
          x1="405"
          y1="305"
          x2="495"
          y2="333"
          className="stroke-[#E11D48] dark:stroke-[#FB7185]"
          strokeWidth="1.5"
        />
        <circle
          cx="405"
          cy="305"
          r="4"
          className="fill-[#E11D48] dark:fill-[#FB7185]"
        />

        {/* 6. Left Data Points & Floating Pills */}

        {/* Pill 1: 10 x Gift card $500.00 (Suspicious Zone) */}
        <g>
          {/* Ping Dot at (222, 79) */}
          <circle cx="222" cy="79" r="11" fill="#F43F5E" fillOpacity="0.25" />
          <circle cx="222" cy="79" r="5.5" fill="#F43F5E" />

          {/* Pill Container */}
          <rect
            x="60"
            y="64"
            width="150"
            height="30"
            rx="15"
            className="fill-white/95 dark:fill-[#0A1D17]/95 stroke-zinc-200/90 dark:stroke-[#1B3E32]"
            strokeWidth="1"
          />
          <text
            x="74"
            y="83"
            className="text-[11.5px] font-sans font-medium fill-zinc-600 dark:fill-zinc-300"
          >
            10 x Gift card{" "}
            <tspan className="font-bold fill-zinc-900 dark:fill-white">
              $500.00
            </tspan>
          </text>
        </g>

        {/* Pill 2: Phone stand $14.00 (Within $30 Zone) */}
        <g>
          {/* Ping Dot at (238, 180) */}
          <circle
            cx="238"
            cy="180"
            r="11"
            className="fill-[#10B981] dark:fill-[#3EE0A8]"
            fillOpacity="0.25"
          />
          <circle
            cx="238"
            cy="180"
            r="5.5"
            className="fill-[#059669] dark:fill-[#3EE0A8]"
          />

          {/* Pill Container */}
          <rect
            x="94"
            y="165"
            width="132"
            height="30"
            rx="15"
            className="fill-white/95 dark:fill-[#0A1D17]/95 stroke-zinc-200/90 dark:stroke-[#1B3E32]"
            strokeWidth="1"
          />
          <text
            x="108"
            y="184"
            className="text-[11.5px] font-sans font-medium fill-zinc-600 dark:fill-zinc-300"
          >
            Phone stand{" "}
            <tspan className="font-bold fill-zinc-900 dark:fill-white">
              $14.00
            </tspan>
          </text>
        </g>

        {/* Pill 3: Keyboard $45.00 (Above $30 Zone) */}
        <g>
          {/* Ping Dot at (230, 276) */}
          <circle cx="230" cy="276" r="11" fill="#F59E0B" fillOpacity="0.25" />
          <circle cx="230" cy="276" r="5.5" fill="#F59E0B" />

          {/* Pill Container */}
          <rect
            x="104"
            y="261"
            width="116"
            height="30"
            rx="15"
            className="fill-white/95 dark:fill-[#0A1D17]/95 stroke-zinc-200/90 dark:stroke-[#1B3E32]"
            strokeWidth="1"
          />
          <text
            x="118"
            y="280"
            className="text-[11.5px] font-sans font-medium fill-zinc-600 dark:fill-zinc-300"
          >
            Keyboard{" "}
            <tspan className="font-bold fill-zinc-900 dark:fill-white">
              $45.00
            </tspan>
          </text>
        </g>

        {/* 7. Right-Hand Decision Cards (Seamless floating on the page) */}

        {/* Card 1: APPROVED */}
        <g transform="translate(495, 51)">
          {/* Card Box */}
          <rect
            width="236"
            height="72"
            rx="16"
            className="fill-white/90 dark:fill-[#0B211A]/90 stroke-[#10B981]/50 dark:stroke-[#3EE0A8]/40 shadow-sm"
            strokeWidth="1.2"
          />
          {/* Circular Badge Icon */}
          <circle
            cx="32"
            cy="36"
            r="16"
            fill="none"
            className="stroke-[#059669] dark:stroke-[#3EE0A8]"
            strokeWidth="1.5"
          />
          <path
            d="M 26 36.5 L 30 40.5 L 38 31.5"
            fill="none"
            className="stroke-[#059669] dark:stroke-[#3EE0A8]"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Text */}
          <text
            x="58"
            y="31"
            className="font-mono text-[12px] font-extrabold tracking-wider fill-[#059669] dark:fill-[#3EE0A8]"
          >
            APPROVED
          </text>
          <text
            x="58"
            y="49"
            className="text-[11.5px] font-sans font-medium fill-zinc-600 dark:fill-zinc-300"
          >
            Paid in PayPal sandbox
          </text>
        </g>

        {/* Card 2: ASK YOU FIRST */}
        <g transform="translate(495, 174)">
          {/* Card Box */}
          <rect
            width="236"
            height="72"
            rx="16"
            className="fill-white/90 dark:fill-[#201808]/90 stroke-[#F59E0B]/50 dark:stroke-[#FBBF24]/40 shadow-sm"
            strokeWidth="1.2"
          />
          {/* Circular Badge Icon */}
          <circle
            cx="32"
            cy="36"
            r="16"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.5"
          />
          <line
            x1="32"
            y1="28"
            x2="32"
            y2="37"
            stroke="#F59E0B"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="32" cy="43" r="1.2" fill="#F59E0B" />
          {/* Text */}
          <text
            x="58"
            y="31"
            className="font-mono text-[12px] font-extrabold tracking-wider fill-[#D97706] dark:fill-[#FBBF24]"
          >
            ASK YOU FIRST
          </text>
          <text
            x="58"
            y="49"
            className="text-[11.5px] font-sans font-medium fill-zinc-600 dark:fill-zinc-300"
          >
            Above your $30 limit
          </text>
        </g>

        {/* Card 3: BLOCKED */}
        <g transform="translate(495, 297)">
          {/* Card Box */}
          <rect
            width="236"
            height="72"
            rx="16"
            className="fill-white/90 dark:fill-[#230C12]/90 stroke-[#F43F5E]/50 dark:stroke-[#FB7185]/40 shadow-sm"
            strokeWidth="1.2"
          />
          {/* Circular Badge Icon */}
          <circle
            cx="32"
            cy="36"
            r="16"
            fill="none"
            stroke="#F43F5E"
            strokeWidth="1.5"
          />
          <path
            d="M 27 31 L 37 41 M 37 31 L 27 41"
            fill="none"
            stroke="#F43F5E"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Text */}
          <text
            x="58"
            y="31"
            className="font-mono text-[12px] font-extrabold tracking-wider fill-[#E11D48] dark:fill-[#FB7185]"
          >
            BLOCKED
          </text>
          <text
            x="58"
            y="49"
            className="text-[11.5px] font-sans font-medium fill-zinc-600 dark:fill-zinc-300"
          >
            SUSPICIOUS, injection
          </text>
        </g>
      </svg>
    </div>
  );
}

export default MandateZonesInfographic;
