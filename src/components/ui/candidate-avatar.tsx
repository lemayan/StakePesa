"use client";

import React, { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntityType =
  | "PERSON"
  | "SPORTS_TEAM"
  | "COMPETITION"
  | "CRYPTO"
  | "GENERIC";

type ImageSource = "WIKIMEDIA" | "AI" | "MANUAL" | "API";

interface CandidateAvatarProps {
  name: string;
  entityType?: EntityType | null;
  imageUrl?: string | null;
  imageSource?: ImageSource | null;
  imageVerified?: boolean;
  imageShape?: "circle" | "square" | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getInitialsBg(name: string): string {
  const PALETTE = [
    "#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e",
    "#ef4444", "#ec4899", "#06b6d4", "#10b981",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return PALETTE[hash % PALETTE.length];
}

/** Border radius CSS value based on entity type / imageShape */
function getBorderRadius(shape: "circle" | "square" | null): string {
  if (shape === "square") return "4px";   // logos: slightly rounded square
  return "50%";                            // persons: full circle
}

/** Object-fit: logos should contain within bounds; faces should cover */
function getObjectFit(shape: "circle" | "square" | null): string {
  return shape === "square" ? "contain" : "cover";
}

// ─── Main avatar component ────────────────────────────────────────────────────

/**
 * Entity-type-aware avatar component.
 *
 * - PERSON      → circular face photo (Wikimedia) or DiceBear portrait
 * - SPORTS_TEAM → square logo with slight rounding
 * - COMPETITION → square logo
 * - CRYPTO      → square coin logo
 * - GENERIC     → renders nothing (returns null — omit from strips)
 */
export function CandidateAvatar({
  name,
  entityType = "GENERIC",
  imageUrl,
  imageSource,
  imageVerified,
  imageShape,
  size = 32,
  className = "",
  style,
}: CandidateAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // GENERIC: Yes → green chip, No → red chip, everything else → nothing
  if (entityType === "GENERIC") {
    const lower = name.trim().toLowerCase();
    if (lower === "yes") {
      return (
        <span
          className={`inline-flex items-center justify-center font-bold tracking-wide select-none shrink-0 ${className}`}
          style={{
            width: size,
            height: size,
            borderRadius: 6,
            fontSize: Math.max(9, Math.round(size * 0.34)),
            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            color: "#fff",
            boxShadow: "0 2px 8px rgba(22,163,74,0.35)",
            letterSpacing: "0.04em",
            ...style,
          }}
          title="Yes"
        >
          YES
        </span>
      );
    }
    if (lower === "no") {
      return (
        <span
          className={`inline-flex items-center justify-center font-bold tracking-wide select-none shrink-0 ${className}`}
          style={{
            width: size,
            height: size,
            borderRadius: 6,
            fontSize: Math.max(9, Math.round(size * 0.34)),
            background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
            color: "#fff",
            boxShadow: "0 2px 8px rgba(220,38,38,0.35)",
            letterSpacing: "0.04em",
            ...style,
          }}
          title="No"
        >
          NO
        </span>
      );
    }
    // Other GENERIC names (e.g. "Other", "Opposition Candidate") → no avatar
    return null;
  }

  const showImage = Boolean(imageUrl) && !imgError;
  const initials = getInitials(name);
  const bgColor = getInitialsBg(name);
  const isAI = imageSource === "AI";
  const isVerified = imageVerified && !isAI;
  const resolvedShape: "circle" | "square" =
    (imageShape as "circle" | "square" | null) ??
    (entityType === "PERSON" ? "circle" : "square");
  const borderRadius = getBorderRadius(resolvedShape);
  const objectFit = getObjectFit(resolvedShape);
  const fontSize = Math.max(9, Math.round(size * 0.36));
  
  // Background for logo containers: dark tinted — lets white logos stay visible
  const logoBg =
    resolvedShape === "square"
      ? "rgba(255,255,255,0.06)"
      : bgColor;

  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size, ...style }}
      title={name}
    >
      {/* ── Main avatar ─────────────────────────────────── */}
      <span
        className="w-full h-full overflow-hidden flex items-center justify-center select-none"
        style={{
          borderRadius,
          background: showImage ? logoBg : bgColor,
          // Padding for logos so they don't touch the edge
          padding: showImage && resolvedShape === "square" ? Math.max(2, size * 0.08) : 0,
        }}
      >
        {showImage ? (
          <img
            src={imageUrl!}
            alt={name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: objectFit as "cover" | "contain",
              borderRadius: resolvedShape === "circle" ? "50%" : 0,
            }}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <span
            className="font-bold tracking-tight text-white"
            style={{ fontSize }}
          >
            {initials}
          </span>
        )}
      </span>

      {/* ── AI badge (person fallback portrait) ─────────── */}
      {showImage && isAI && (
        <span
          className="absolute bottom-0 right-0 rounded-full font-bold text-white leading-none flex items-center justify-center"
          style={{
            fontSize: 6,
            width: Math.max(10, size * 0.32),
            height: Math.max(10, size * 0.32),
            background: "rgba(139, 92, 246, 0.92)",
            border: "1px solid rgba(255,255,255,0.4)",
          }}
        >
          AI
        </span>
      )}

      {/* ── Verification dot (Wikimedia / API) ──────────── */}
      {showImage && isVerified && (
        <span
          className="absolute bottom-0 right-0 rounded-full flex items-center justify-center"
          style={{
            width: Math.max(8, size * 0.28),
            height: Math.max(8, size * 0.28),
            background: "#22c55e",
            border: "1.5px solid var(--color-bg, #0f1117)",
          }}
          title="Verified image"
        >
          <svg
            width={Math.max(5, size * 0.16)}
            height={Math.max(5, size * 0.16)}
            viewBox="0 0 8 8"
            fill="none"
          >
            <polyline
              points="1.5,4 3,5.5 6.5,2"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </span>
  );
}

// ─── Avatar strip (multiple options) ──────────────────────────────────────────

interface AvatarStripOption {
  name: string;
  entityType?: EntityType | null;
  imageUrl?: string | null;
  imageSource?: ImageSource | null;
  imageVerified?: boolean;
  imageShape?: "circle" | "square" | null;
}

interface AvatarStripProps {
  options: AvatarStripOption[];
  max?: number;
  size?: number;
}

/**
 * Renders a stacked strip of CandidateAvatars.
 * GENERIC options (Yes/No/Other) are automatically skipped.
 */
export function AvatarStrip({ options, max = 3, size = 28 }: AvatarStripProps) {
  // Include Yes/No chips + all non-GENERIC avatars; skip other GENERIC names
  const visual = options.filter((o) => {
    if (o.entityType !== "GENERIC") return o.entityType != null;
    const lower = o.name.trim().toLowerCase();
    return lower === "yes" || lower === "no";
  });

  if (visual.length === 0) return null;

  const visible = visual.slice(0, max);
  const overflow = visual.length - max;
  const overlap = Math.round(size * 0.3);

  return (
    <span className="inline-flex items-center">
      {visible.map((opt, i) => (
        <CandidateAvatar
          key={opt.name}
          name={opt.name}
          entityType={opt.entityType}
          imageUrl={opt.imageUrl}
          imageSource={opt.imageSource}
          imageVerified={opt.imageVerified}
          imageShape={opt.imageShape}
          size={size}
          className="ring-1 ring-[var(--color-bg,#0f1117)]"
          style={{ marginLeft: i > 0 ? -overlap : 0 }}
        />
      ))}
      {overflow > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full text-fg-muted font-mono ring-1 ring-[var(--color-bg,#0f1117)] bg-bg-above"
          style={{
            width: size,
            height: size,
            fontSize: Math.max(8, size * 0.3),
            marginLeft: -overlap,
          }}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
