"use client";

import { motion } from "framer-motion";
import { CodeXml, Cog, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { SafeImage } from "@/components/ui/safe-image";

export function HeroCopy({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

const float = (distance: number, duration: number, delay = 0) => ({
  animate: { y: [0, -distance, 0] },
  transition: { duration, delay, repeat: Infinity, ease: "easeInOut" as const },
});

/** The site logo on the phone screen: breathing glow, ripples and a light sweep. */
function ScreenLogo({ logo }: { logo: string }) {
  return (
    <div className="absolute top-[14%] left-1/2 flex aspect-square w-[62%] -translate-x-1/2 items-center justify-center">
      {/* Ripples spreading out from the logo */}
      {[0, 1.2].map((delay) => (
        <motion.span
          key={delay}
          className="absolute inset-0 rounded-full border-2 border-cyan/70"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: [0.7, 1.35], opacity: [0.8, 0] }}
          transition={{ duration: 2.4, delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* Rotating neon halo */}
      <motion.span
        className="absolute inset-[6%] rounded-full bg-[conic-gradient(from_0deg,#00e5ff,#087bff,#c04dff,#00e5ff)] p-[2px] opacity-90 blur-[1px]"
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      >
        <span className="block size-full rounded-full bg-[#120833]" />
      </motion.span>

      {/* The logo itself, gently breathing */}
      <motion.div
        className="relative size-[80%] overflow-hidden rounded-full"
        animate={{
          scale: [1, 1.06, 1],
          filter: [
            "drop-shadow(0 0 8px rgb(0 229 255 / 0.5))",
            "drop-shadow(0 0 22px rgb(0 229 255 / 0.95))",
            "drop-shadow(0 0 8px rgb(0 229 255 / 0.5))",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {logo ? (
          <SafeImage src={logo} alt="" fill sizes="160px" priority className="object-contain" />
        ) : (
          <svg viewBox="0 0 48 48" className="size-full p-[12%]">
            <defs>
              <linearGradient id="screen-mark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#00e5ff" />
                <stop offset="1" stopColor="#087bff" />
              </linearGradient>
            </defs>
            <path d="M7 5h11v22a6 6 0 0 0 12 0V5h11v22a17 17 0 0 1-34 0z" fill="url(#screen-mark)" />
          </svg>
        )}
        {/* Light sweep across the logo */}
        <motion.span
          className="absolute inset-y-0 w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-white/45 to-transparent"
          initial={{ left: "-60%" }}
          animate={{ left: ["-60%", "130%"] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}

/** Decorative phone scene built from CSS and SVG, so it needs no image download. */
export function HeroVisual({ logo = "" }: { logo?: string }) {
  return (
    <div aria-hidden className="relative mx-auto h-[25rem] w-full max-w-[34rem] select-none sm:h-[31rem]">
      {/* Pedestal glow */}
      <div className="absolute bottom-1 left-1/2 h-16 w-[85%] -translate-x-1/2 rounded-[50%] bg-linear-to-r from-primary/70 via-cyan/60 to-purple/70 blur-2xl" />
      <div className="absolute bottom-5 left-1/2 h-10 w-[70%] -translate-x-1/2 rounded-[50%] border border-cyan/60 bg-surface shadow-[0_0_30px_rgb(0_229_255/0.5)]" />

      {/* Rear phone, showing the camera side */}
      <motion.div
        {...float(10, 6.5, 0.5)}
        className="absolute top-[3%] right-[9%] h-[78%] w-[41%] rotate-[7deg] rounded-[2.2rem] border-2 border-[#9fb4ff]/70 bg-linear-to-br from-[#aebcf5] via-[#6f7fd6] to-[#35408f] shadow-[0_0_38px_rgb(120_130_255/0.55)]"
      >
        <div className="absolute top-[4%] right-[7%] grid w-[52%] grid-cols-2 gap-1.5 rounded-[1.1rem] bg-[#1d2455]/70 p-2">
          {[0, 1, 2].map((lens) => (
            <span
              key={lens}
              className="aspect-square rounded-full border-2 border-[#3a4590] bg-[radial-gradient(circle_at_40%_35%,#5fb7ff,#0a1136_62%)]"
            />
          ))}
        </div>
      </motion.div>

      {/* Front phone */}
      <motion.div
        {...float(14, 5.5)}
        className="absolute top-[7%] left-[17%] h-[82%] w-[44%] -rotate-[5deg] rounded-[2.4rem] border-[3px] border-[#a9bcff] bg-black p-1.5 shadow-[0_0_46px_rgb(8_123_255/0.8)]"
      >
        <div className="relative h-full overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_20%,#b78cff,#5b2bc7_38%,#120833_66%,#02030a)]">
          <div className="absolute top-2 left-1/2 h-4 w-[34%] -translate-x-1/2 rounded-full bg-black" />
          <div className="absolute inset-x-[-25%] top-[48%] aspect-square rounded-full border border-white/25 bg-black/70" />
          <ScreenLogo logo={logo} />
        </div>
      </motion.div>

      {/* Neon orbit ring */}
      <svg viewBox="0 0 500 200" className="absolute top-[42%] left-0 w-full overflow-visible" fill="none">
        <defs>
          <linearGradient id="hero-ring" x1="0" x2="1">
            <stop offset="0" stopColor="#00e5ff" />
            <stop offset="0.55" stopColor="#087bff" />
            <stop offset="1" stopColor="#c04dff" />
          </linearGradient>
          <filter id="hero-glow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <ellipse cx="250" cy="95" rx="225" ry="70" stroke="url(#hero-ring)" strokeWidth="5" filter="url(#hero-glow)" transform="rotate(-6 250 95)" />
      </svg>

      {/* Floating technology badges */}
      <motion.div {...float(9, 4.5, 0.2)} className="absolute top-[3%] right-0">
        <Cog className="animate-spin-slow size-20 text-primary drop-shadow-[0_0_14px_rgb(8_123_255/0.9)] sm:size-24" />
      </motion.div>
      <motion.div
        {...float(11, 5, 0.8)}
        className="absolute top-[37%] right-0 flex size-20 rotate-6 items-center justify-center rounded-2xl border-2 border-cyan bg-surface/90 shadow-[0_0_24px_rgb(0_229_255/0.6)] sm:size-24"
      >
        <CodeXml className="size-11 text-cyan" />
      </motion.div>
      <motion.div {...float(7, 4, 1.2)} className="absolute right-[12%] bottom-[10%]">
        <Wrench className="size-16 -scale-x-100 text-[#4aa3ff] drop-shadow-[0_0_12px_rgb(74_163_255/0.9)] sm:size-20" />
      </motion.div>
    </div>
  );
}
