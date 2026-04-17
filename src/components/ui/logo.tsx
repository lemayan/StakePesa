"use client";

import { motion, Variants } from "framer-motion";

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className = "", iconSize = 42, textSize = "text-[24px]" }: LogoProps) {
  // Aggressive separation and crashing together
  const leftRing: Variants = {
    hidden: { x: -40, rotate: -15, opacity: 0 },
    visible: {
      x: 0,
      rotate: 0,
      opacity: 1,
      // Massive stiff spring for aggressive snap
      transition: { type: "spring", stiffness: 800, damping: 20, delay: 0.1 }
    },
    hover: {
      x: -12,
      rotate: -5,
      transition: { type: "spring", stiffness: 400, damping: 15 }
    }
  };

  const rightRing: Variants = {
    hidden: { x: 40, rotate: 15, opacity: 0 },
    visible: {
      x: 0,
      rotate: 0,
      opacity: 1,
      // Massive stiff spring for aggressive snap
      transition: { type: "spring", stiffness: 800, damping: 20, delay: 0.1 }
    },
    hover: {
      x: 12,
      rotate: 5,
      transition: { type: "spring", stiffness: 400, damping: 15 }
    }
  };

  const interlock: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { duration: 0.05, delay: 0.28 } // Fades in EXACTLY at the crash
    },
    hover: { 
      opacity: 0, 
      transition: { duration: 0.1 } 
    } 
  };

  // The explosive "Light" flare when they crash
  const glowCrash: Variants = {
    hidden: { scale: 0.1, opacity: 0, filter: "blur(0px)" },
    visible: {
      scale: [0.1, 2.5, 1],
      opacity: [0, 0.8, 0],
      filter: ["blur(0px)", "blur(20px)", "blur(30px)"],
      transition: { duration: 1.2, delay: 0.25, ease: "easeOut" }
    },
    hover: {
      scale: 1.6,
      opacity: 0.3,
      filter: "blur(20px)",
      transition: { repeat: Infinity, repeatType: "mirror", duration: 1.2 }
    }
  };

  return (
    <motion.div 
      className={`flex items-center gap-3 select-none cursor-pointer ${className}`}
      initial="hidden"
      animate="visible"
      whileHover="hover"
    >
      <div className="relative flex items-center justify-center shrink-0">
        <svg 
          width={iconSize * 1.1}
          height={iconSize} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-md relative z-10 overflow-visible"
        >
          {/* Explosive bright light flare */}
          <motion.circle
            cx="50"
            cy="50"
            r="35"
            fill="#FFFFFF"
            className="mix-blend-overlay"
            variants={glowCrash}
          />
          <motion.circle
            cx="50"
            cy="50"
            r="38"
            fill="#A2B2E6"
            className="mix-blend-screen"
            variants={glowCrash}
            style={{ transitionDelay: "150px" }}
          />

          {/* Right square (periwinkle blue) */}
          <motion.g variants={rightRing}>
            <rect 
              x="38.78" y="28.78" width="42.43" height="42.43" rx="8" 
              transform="rotate(45 60 50)" 
              stroke="#A2B2E6" strokeWidth="12" fill="none" 
            />
          </motion.g>
          
          {/* Left square (peachy pink) */}
          <motion.g variants={leftRing}>
            <rect 
              x="18.78" y="28.78" width="42.43" height="42.43" rx="8" 
              transform="rotate(45 40 50)" 
              stroke="#F0B1B6" strokeWidth="12" fill="none" 
            />
          </motion.g>
          
          {/* Interlock bridge */}
          <motion.g variants={interlock}>
            <line 
              x1="40" y1="60" x2="56" y2="76" 
              stroke="#A2B2E6" strokeWidth="12.5" 
              strokeLinecap="butt" 
            />
          </motion.g>
        </svg>
      </div>
      <motion.span 
        className={`font-black tracking-tighter text-fg font-sans ${textSize}`}
        variants={{
          hidden: { opacity: 0, x: -15 },
          visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 400, damping: 25, delay: 0.3 } }
        }}
      >
        StakePesa
      </motion.span>
    </motion.div>
  );
}
