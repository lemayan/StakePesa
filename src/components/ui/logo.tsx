interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className = "", iconSize = 36, textSize = "text-[20px]" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <svg 
        width={iconSize * 1.05} // slight extra width for visual balance
        height={iconSize} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 drop-shadow-sm"
      >
        {/* Right square (periwinkle blue) - drawn first so it's behind at the top intersection */}
        <rect 
          x="38.78" y="28.78" width="42.43" height="42.43" rx="8" 
          transform="rotate(45 60 50)" 
          stroke="#A2B2E6" strokeWidth="12" fill="none" 
        />
        
        {/* Left square (peachy pink) - drawn second so it overlaps at the top */}
        <rect 
          x="18.78" y="28.78" width="42.43" height="42.43" rx="8" 
          transform="rotate(45 40 50)" 
          stroke="#F0B1B6" strokeWidth="12" fill="none" 
        />
        
        {/* Interlock fix: Redraw the bottom-left segment of the Right square over the Left one */}
        {/* Intersection is at (50, 70). We draw a mathematically coplanar patch from (40, 60) to (56, 76) */}
        <line 
          x1="40" y1="60" x2="56" y2="76" 
          stroke="#A2B2E6" strokeWidth="12.5" /* slightly thicker to prevent anti-aliasing seams */
          strokeLinecap="butt" 
        />
      </svg>
      <span className={`font-bold tracking-tight text-fg font-sans ${textSize}`}>
        StakePesa
      </span>
    </div>
  );
}
