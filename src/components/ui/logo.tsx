"use client";

import { useEffect } from "react";
import { motion, Variants } from "framer-motion";
import { useAnimationControls } from "framer-motion";

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className = "", iconSize = 36, textSize = "text-[20px]" }: LogoProps) {
  const controls = useAnimationControls();

  useEffect(() => {
    let active = true;

    const run = async () => {
      await controls.start("visible");
      if (active) {
        controls.start("pulse");
      }
    };

    void run();

    return () => {
      active = false;
      controls.stop();
    };
  }, [controls]);

  // Keep motion focused on the rings so surrounding UI stays visually stable.
  const leftRing: Variants = {
    hidden: { x: -18, rotate: -8, opacity: 0 },
    visible: {
      x: 0,
      rotate: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 420, damping: 22, delay: 0.1 }
    },
    pulse: {
      x: [0, -10, 0, -8, 0],
      rotate: [0, -2, 0.8, -1, 0],
      transition: { duration: 0.55, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" },
    },
    hover: {
      x: [0, -10, 0, -8, 0],
      rotate: [0, -2, 0.8, -1, 0],
      transition: { duration: 0.55, repeat: Infinity, ease: "easeInOut" },
    },
  };

  const rightRing: Variants = {
    hidden: { x: 18, rotate: 8, opacity: 0 },
    visible: {
      x: 0,
      rotate: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 420, damping: 22, delay: 0.1 }
    },
    pulse: {
      x: [0, 10, 0, 8, 0],
      rotate: [0, 2, -0.8, 1, 0],
      transition: { duration: 0.55, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" },
    },
    hover: {
      x: [0, 10, 0, 8, 0],
      rotate: [0, 2, -0.8, 1, 0],
      transition: { duration: 0.55, repeat: Infinity, ease: "easeInOut" },
    },
  };

  const interlock: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.15, delay: 0.3 } 
    },
    pulse: {
      opacity: [1, 0, 1, 0.35, 1],
      transition: { duration: 0.55, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" },
    },
    hover: {
      opacity: [1, 0, 1, 0.35, 1],
      transition: { duration: 0.55, repeat: Infinity, ease: "easeInOut" },
    }, // Fade bridge so split rings read clearly
  };

  const glowPulse: Variants = {
    hidden: { scale: 0.5, opacity: 0 },
    visible: {
      scale: [0.5, 2, 1],
      opacity: [0, 0.4, 0],
      transition: { duration: 0.8, delay: 0.25, ease: "easeOut" }
    },
    pulse: {
      scale: [1, 1.16, 1],
      opacity: [0, 0.14, 0],
      transition: { duration: 0.55, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" },
    },
    hover: {
      scale: 1.15,
      opacity: 0.14,
      transition: { repeat: Infinity, repeatType: "mirror", duration: 1.1 }
    }
  };

  return (
    <motion.div 
      className={`flex items-center gap-2.5 select-none cursor-pointer ${className}`}
      initial="hidden"
      animate={controls}
      whileHover="hover"
      whileTap="hover"
    >
      <div className="relative flex items-center justify-center shrink-0">
        <svg 
          width={iconSize * 1.05}
          height={iconSize} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm relative z-10 overflow-visible"
        >
          {/* Base glow circle behind rings - fires a pulse on load and gentle glow on hover */}
          <motion.circle
            cx="50"
            cy="50"
            r="30"
            fill="#F0B1B6"
            className="blur-xl"
            variants={glowPulse}
          />
          <motion.circle
            cx="50"
            cy="50"
            r="30"
            fill="#A2B2E6"
            className="blur-xl mix-blend-screen"
            variants={glowPulse}
            style={{ transitionDelay: "100ms" }}
          />

          {/* Right square (periwinkle blue) - drawn first so it's behind at the top intersection */}
          <motion.g variants={rightRing}>
            <rect 
              x="38.78" y="28.78" width="42.43" height="42.43" rx="8" 
              transform="rotate(45 60 50)" 
              stroke="#A2B2E6" strokeWidth="12" fill="none" 
            />
          </motion.g>
          
          {/* Left square (peachy pink) - drawn second so it overlaps at the top */}
          <motion.g variants={leftRing}>
            <rect 
              x="18.78" y="28.78" width="42.43" height="42.43" rx="8" 
              transform="rotate(45 40 50)" 
              stroke="#F0B1B6" strokeWidth="12" fill="none" 
            />
          </motion.g>
          
          {/* Interlock fix is on its own layer so it can fade out and reveal the separation smoothly */}
          <motion.g variants={interlock}>
            <line 
              x1="40" y1="60" x2="56" y2="76" 
              stroke="#A2B2E6" strokeWidth="12.5" 
              strokeLinecap="butt" 
            />
          </motion.g>
        </svg>
      </div>
      <span className={`font-bold tracking-tight text-fg font-sans ${textSize}`}>
        StakePesa
      </span>
    </motion.div>
  );
}
