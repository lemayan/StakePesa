"use client";

import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { getGoogleProviderPhoto, updateProfileAvatar, updateProfileName } from "@/actions/auth";

const AVATAR_STYLES = [
  { id: "adventurer-neutral", label: "Adventurer" },
  { id: "micah", label: "Micah" },
  { id: "lorelei-neutral", label: "Lorelei" },
  { id: "bottts-neutral", label: "Bottts" },
  { id: "pixel-art-neutral", label: "Pixel" },
] as const;

const AVATAR_MOODS = [
  { id: "neutral", label: "Neutral" },
  { id: "happy", label: "Happy" },
  { id: "sad", label: "Sad" },
  { id: "surprised", label: "Surprised" },
] as const;

const BG_PALETTES = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "caffbf"] as const;

function isDiceBearUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "api.dicebear.com" &&
      parsed.pathname.startsWith("/9.x/") &&
      (parsed.pathname.endsWith("/svg") || parsed.pathname.endsWith(".svg"))
    );
  } catch {
    return false;
  }
}

function supportsMood(style: string) {
  return style === "adventurer-neutral" || style === "micah" || style === "lorelei-neutral";
}

function applyStyleMoodParams(
  params: URLSearchParams,
  style: string,
  mood: (typeof AVATAR_MOODS)[number]["id"]
) {
  if (mood === "neutral") return;

  if (style === "micah") {
    const mouthByMood: Record<string, string> = {
      happy: "smile,laughing",
      sad: "sad,frown,nervous",
      surprised: "surprised,pucker",
    };
    const mouth = mouthByMood[mood];
    if (mouth) params.set("mouth", mouth);
    return;
  }

  if (style === "lorelei-neutral") {
    const mouthByMood: Record<string, string> = {
      happy: "happy09,happy12,happy15,happy18",
      sad: "sad02,sad04,sad07,sad09",
      surprised: "happy01,happy02,sad01",
    };
    const mouth = mouthByMood[mood];
    if (mouth) params.set("mouth", mouth);
    return;
  }

  if (style === "adventurer-neutral") {
    const mouthByMood: Record<string, string> = {
      happy: "variant01,variant07,variant14,variant21,variant28",
      sad: "variant03,variant10,variant17,variant24,variant30",
      surprised: "variant05,variant12,variant19,variant26",
    };
    const mouth = mouthByMood[mood];
    if (mouth) params.set("mouth", mouth);
  }
}

function buildAvatarUrl(
  style: string,
  seed: string,
  bgColor: string,
  mood: (typeof AVATAR_MOODS)[number]["id"]
) {
  const safeSeed = seed.trim() || "StakePesa";
  const params = new URLSearchParams({
    seed: safeSeed,
    size: "256",
    backgroundColor: bgColor,
  });

  if (supportsMood(style)) {
    applyStyleMoodParams(params, style, mood);
  }

  return `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`;
}

function randomSeed(base: string) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "trader"}-${suffix}`;
}

function getAvatarSource(image: string | null | undefined) {
  if (!image) return { label: "Initials", tone: "text-fg-muted bg-bg-above" };
  if (isDiceBearUrl(image)) return { label: "Custom Avatar", tone: "text-green bg-green/8" };
  return { label: "Google Photo", tone: "text-blue-400 bg-blue-500/10" };
}

function createVariantSeeds(baseSeed: string, nonce: number, count = 5) {
  const base = (baseSeed.trim() || "StakePesa").toLowerCase();
  let hash = 0;
  for (let i = 0; i < `${base}-${nonce}`.length; i++) {
    hash = (hash * 31 + `${base}-${nonce}`.charCodeAt(i)) >>> 0;
  }
  const seeds: string[] = [];
  for (let i = 0; i < count; i++) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const token = hash.toString(36).slice(0, 5);
    seeds.push(`${baseSeed.trim() || "StakePesa"}-${token}`);
  }
  return seeds;
}

function providerPhotoStorageKey(userId: string) {
  return `stakepesa:provider-photo:${userId}`;
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }
  return target.isContentEditable;
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const studioDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const studioContentRef = useRef<HTMLDivElement | null>(null);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);
  const [optimisticImage, setOptimisticImage] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState<(typeof AVATAR_STYLES)[number]["id"]>("adventurer-neutral");
  const [avatarMood, setAvatarMood] = useState<(typeof AVATAR_MOODS)[number]["id"]>("neutral");
  const [avatarSeed, setAvatarSeed] = useState<string | undefined>(undefined);
  const [avatarBg, setAvatarBg] = useState<(typeof BG_PALETTES)[number]>(BG_PALETTES[0]);
  const [variantShuffleNonce, setVariantShuffleNonce] = useState(0);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [mobileAvatarTab, setMobileAvatarTab] = useState<"seed" | "style" | "mood" | "bg" | "variants">("style");
  const [mobileKeyboardOpen, setMobileKeyboardOpen] = useState(false);
  const [providerImage, setProviderImage] = useState<string | null>(null);
  const [failedPreviewUrls, setFailedPreviewUrls] = useState<Record<string, true>>({});
  const { toast } = useToast();

  const closeStudioOnMobile = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setIsStudioOpen(false);
      setMobileKeyboardOpen(false);
    }
  };

  const openAvatarStudio = () => {
    setIsStudioOpen(true);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        studioDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const displayNameInput = displayName ?? session?.user?.name ?? "";
  const avatarSeedInput = avatarSeed ?? session?.user?.name ?? session?.user?.email ?? "StakePesa";
  const sessionProviderPhoto =
    (session?.user as { providerImage?: string | null } | undefined)?.providerImage ?? null;
  const providerPhoto =
    providerImage ??
    (session?.user?.image && !isDiceBearUrl(session.user.image) ? session.user.image : null) ??
    (sessionProviderPhoto && !isDiceBearUrl(sessionProviderPhoto) ? sessionProviderPhoto : null);
  const effectiveSessionImage =
    optimisticImage !== undefined ? optimisticImage : (session?.user?.image ?? null);
  const activeAvatar = getAvatarSource(effectiveSessionImage);

  const generatedAvatarUrl = buildAvatarUrl(avatarStyle, avatarSeedInput, avatarBg, avatarMood);
  const quickVariantSeeds = createVariantSeeds(avatarSeedInput, variantShuffleNonce);
  const quickVariantUrls = quickVariantSeeds.map((seed) =>
    buildAvatarUrl(avatarStyle, seed, avatarBg, avatarMood)
  );
  const sessionImage = effectiveSessionImage;
  const previewImageError = Boolean(failedPreviewUrls[generatedAvatarUrl]);

  const initials = (displayNameInput || session?.user?.name || "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??";

  const handleSave = async () => {
    if (!session?.user?.id) {
      toast("error", "Not authenticated", "Please sign in again");
      return;
    }
    const trimmed = displayNameInput.trim();
    if (!trimmed) {
      toast("error", "Name required", "Display name cannot be empty");
      return;
    }
    if (trimmed === session.user.name) {
      toast("info", "No changes", "Your name is already set to this");
      return;
    }

    setSaving(true);
    const result = await updateProfileName(session.user.id, trimmed);

    if (result.error) {
      toast("error", "Update failed", result.error);
      setSaving(false);
      return;
    }

    // Trigger NextAuth session refresh — this calls the jwt callback with trigger="update"
    await updateSession({ name: result.name });
    setSaving(false);
    toast("success", "Profile updated!", `Your name is now "${result.name}"`);
  };

  const handleSaveAvatar = async () => {
    if (!session?.user?.id) {
      toast("error", "Not authenticated", "Please sign in again");
      return;
    }

    const sourceProviderPhoto =
      (session.user.image && !isDiceBearUrl(session.user.image) ? session.user.image : null) ||
      (sessionProviderPhoto && !isDiceBearUrl(sessionProviderPhoto) ? sessionProviderPhoto : null);

    if (!providerImage && sourceProviderPhoto) {
      setProviderImage(sourceProviderPhoto);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(providerPhotoStorageKey(session.user.id), sourceProviderPhoto);
      }
    }

    setSavingAvatar(true);
    const result = await updateProfileAvatar(session.user.id, generatedAvatarUrl);

    if (result.error) {
      setSavingAvatar(false);
      toast("error", "Avatar update failed", result.error);
      return;
    }

    setOptimisticImage(result.image);
    await updateSession({ image: result.image });
    setSavingAvatar(false);
    toast("success", "Avatar saved", "Your new avatar is now active.");
    closeStudioOnMobile();
  };

  const handleUseProviderPhoto = async () => {
    if (!session?.user?.id) {
      toast("error", "Not authenticated", "Please sign in again");
      return;
    }

    const fallbackProviderPhoto =
      providerPhoto ||
      (typeof window !== "undefined"
        ? window.localStorage.getItem(providerPhotoStorageKey(session.user.id))
        : null);

    let resolvedProviderPhoto = fallbackProviderPhoto;

    if (!resolvedProviderPhoto) {
      const recovered = await getGoogleProviderPhoto(session.user.id);
      if (recovered.error || !recovered.image) {
        toast("info", "No provider photo", recovered.error || "Sign in with Google to restore your provider photo.");
        return;
      }

      resolvedProviderPhoto = recovered.image;
      setProviderImage(recovered.image);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(providerPhotoStorageKey(session.user.id), recovered.image);
      }
    }

    setSavingAvatar(true);
    const result = await updateProfileAvatar(session.user.id, resolvedProviderPhoto);

    if (result.error) {
      setSavingAvatar(false);
      toast("error", "Restore failed", result.error);
      return;
    }

    setOptimisticImage(result.image);
    if (result.image) {
      setProviderImage(result.image);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(providerPhotoStorageKey(session.user.id), result.image);
      }
    }
    await updateSession({ image: result.image });
    setSavingAvatar(false);
    toast("success", "Photo restored", "Your provider profile photo is active again.");
    closeStudioOnMobile();
  };

  const handleUseInitials = async () => {
    if (!session?.user?.id) {
      toast("error", "Not authenticated", "Please sign in again");
      return;
    }

    setSavingAvatar(true);
    const result = await updateProfileAvatar(session.user.id, null);

    if (result.error) {
      setSavingAvatar(false);
      toast("error", "Reset failed", result.error);
      return;
    }

    setOptimisticImage(null);
    await updateSession({ image: null });
    setSavingAvatar(false);
    toast("success", "Avatar cleared", "You will now use initials when no photo is available.");
    closeStudioOnMobile();
  };

  const handleCopyAvatarLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedAvatarUrl);
        toast("success", "Link copied", "Avatar link copied to clipboard.");
        return;
      }

      if (typeof document !== "undefined") {
        const input = document.createElement("textarea");
        input.value = generatedAvatarUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        toast("success", "Link copied", "Avatar link copied to clipboard.");
        return;
      }

      toast("info", "Copy unavailable", "Your browser blocked clipboard access.");
    } catch {
      toast("error", "Copy failed", "Could not copy avatar link. Please try again.");
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* ── Identity card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="border border-line rounded-lg overflow-hidden"
      >
        <div className="h-9 flex items-center px-3 border-b border-line bg-bg-above/40 text-[11px] font-mono text-fg-muted uppercase tracking-wider">
          Identity
        </div>
        <div className="p-5">
          <div className="flex items-start gap-4 mb-5">
            <button
              type="button"
              onClick={openAvatarStudio}
              className="w-14 h-14 rounded-lg bg-bg-above border border-line flex items-center justify-center shrink-0 overflow-hidden hover:border-green/45 transition-colors"
              title="Open Avatar Studio"
              aria-label="Open Avatar Studio"
            >
              {sessionImage ? (
                <img
                  src={sessionImage}
                  alt="Profile"
                  loading="eager"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[20px] font-mono font-bold text-fg-muted">{initials}</span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[18px] font-bold truncate">
                {displayName || session?.user?.name || "User"}
              </p>
              <p className="text-[13px] text-fg-muted font-mono truncate">
                {session?.user?.email}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] font-mono text-green bg-green/8 px-1.5 py-0.5 rounded font-medium">
                  VERIFIED
                </span>
                <span className="text-[10px] font-mono text-fg-muted bg-bg-above px-1.5 py-0.5 rounded">
                  Member since Mar 2025
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${activeAvatar.tone}`}>
                  {activeAvatar.label}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-1.5">
                Display name
              </label>
              <input
                type="text"
                value={displayNameInput}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full max-w-sm h-9 px-3 text-[14px] bg-transparent border border-line rounded-md focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-4 text-[13px] font-semibold bg-green text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Avatar studio ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.45 }}
        className="border border-line rounded-lg overflow-hidden"
      >
        <details
          ref={studioDetailsRef}
          className="group"
          open={isStudioOpen}
          onToggle={(e) => {
            setIsStudioOpen(e.currentTarget.open);
            if (!e.currentTarget.open) {
              setMobileKeyboardOpen(false);
            }
          }}
        >
          <summary className="h-11 px-3 flex items-center justify-between gap-3 bg-bg-above/40 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
            <div className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">
              Avatar Studio
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono px-2 py-1 rounded-md border border-line ${activeAvatar.tone}`}>
                Active: {activeAvatar.label}
              </span>
              <span className="text-[11px] font-mono text-fg-muted group-open:hidden">Open</span>
              <span className="text-[11px] font-mono text-fg-muted hidden group-open:inline">Close</span>
            </div>
          </summary>

          <div
            ref={studioContentRef}
            className="p-5 space-y-4 border-t border-line"
            onFocusCapture={(e) => {
              if (isEditableElement(e.target)) {
                setMobileKeyboardOpen(true);
              }
            }}
            onBlurCapture={() => {
              if (typeof window === "undefined") return;
              window.requestAnimationFrame(() => {
                const activeElement = document.activeElement;
                if (studioContentRef.current?.contains(activeElement) && isEditableElement(activeElement)) {
                  return;
                }
                setMobileKeyboardOpen(false);
              });
            }}
          >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[13px] text-fg-muted max-w-2xl">
              Keep your Google photo or craft a custom avatar. Pick a style, tune your seed, and apply when it feels right.
            </p>
            <span className={`text-[11px] font-mono px-2 py-1 rounded-md border border-line ${activeAvatar.tone}`}>
              Active: {activeAvatar.label}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-4">
            <div className="border border-line rounded-2xl p-3 bg-linear-to-b from-bg-above/50 to-transparent">
              <div className="aspect-square rounded-xl bg-bg-above/40 border border-line/70 overflow-hidden flex items-center justify-center relative">
                {previewImageError ? (
                  <div className="text-center px-3">
                    <span className="text-[20px] font-mono font-bold text-fg-muted">{initials}</span>
                    <p className="text-[10px] text-fg-muted mt-1">Preview unavailable</p>
                  </div>
                ) : (
                  <img
                    key={generatedAvatarUrl}
                    src={generatedAvatarUrl}
                    alt="Avatar preview"
                    loading="eager"
                    onError={() =>
                      setFailedPreviewUrls((prev) => ({
                        ...prev,
                        [generatedAvatarUrl]: true,
                      }))
                    }
                    className="w-full h-full object-cover"
                  />
                )}
                <span className="absolute bottom-2 left-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg/85 border border-line text-fg-muted">
                  LIVE PREVIEW
                </span>
              </div>
              <p className="mt-2 text-[11px] text-fg-muted font-mono uppercase tracking-wider">
                {avatarStyle.replace("-neutral", "")}
              </p>
            </div>

            <div className="space-y-4 border border-line rounded-2xl p-4 bg-bg-above/20 pb-32 lg:pb-4">
              <div className="lg:hidden -mx-1">
                <div className="flex gap-2 overflow-x-auto pb-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {[
                    ["style", "Style"],
                    ["seed", "Seed"],
                    ["mood", "Mood"],
                    ["bg", "BG"],
                    ["variants", "Variants"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        setMobileAvatarTab(id as "seed" | "style" | "mood" | "bg" | "variants")
                      }
                      className={`shrink-0 h-8 px-3 text-[11px] font-mono rounded-full border transition-all ${
                        mobileAvatarTab === id
                          ? "border-green bg-green/10 text-green"
                          : "border-line text-fg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${mobileAvatarTab === "seed" ? "block" : "hidden"} lg:block`}>
                <label className="text-[11px] font-mono text-fg-muted uppercase tracking-wider block mb-1.5">
                  Avatar seed
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={avatarSeedInput}
                    onChange={(e) => setAvatarSeed(e.target.value)}
                    className="w-full h-10 px-3 text-[14px] bg-bg border border-line rounded-md focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setAvatarSeed(randomSeed(displayName || session?.user?.name || "trader"))}
                    className="h-10 px-3 text-[12px] font-semibold border border-line rounded-md hover:border-green/50 hover:text-green transition-colors"
                  >
                    Randomize
                  </button>
                </div>
              </div>

              <div className={`${mobileAvatarTab === "style" ? "block" : "hidden"} lg:block`}>
                <label className="text-[11px] font-mono text-fg-muted uppercase tracking-wider block mb-2">
                  Style
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {AVATAR_STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setAvatarStyle(style.id)}
                      className={`h-9 px-2 text-[12px] rounded-md border transition-all ${
                        avatarStyle === style.id
                          ? "border-green bg-green/10 text-green shadow-[0_0_0_1px_rgba(34,197,94,0.25)]"
                          : "border-line text-fg-muted hover:border-green/35 hover:text-fg"
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${mobileAvatarTab === "mood" ? "block" : "hidden"} lg:block`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-mono text-fg-muted uppercase tracking-wider block">
                    Mood
                  </label>
                  <span className="text-[10px] text-fg-muted">Applied where supported</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_MOODS.map((mood) => (
                    <button
                      key={mood.id}
                      type="button"
                      onClick={() => setAvatarMood(mood.id)}
                      className={`h-8 px-3 text-[12px] rounded-md border transition-all ${
                        avatarMood === mood.id
                          ? "border-green bg-green/10 text-green"
                          : "border-line text-fg-muted hover:border-green/35 hover:text-fg"
                      }`}
                    >
                      {mood.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${mobileAvatarTab === "bg" ? "block" : "hidden"} lg:block`}>
                <label className="text-[11px] font-mono text-fg-muted uppercase tracking-wider block mb-2">
                  Background
                </label>
                <div className="flex flex-wrap gap-2">
                  {BG_PALETTES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarBg(color)}
                      className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-105 ${
                        avatarBg === color ? "border-green shadow-[0_0_0_2px_rgba(34,197,94,0.2)]" : "border-line"
                      }`}
                      style={{ backgroundColor: `#${color}` }}
                      aria-label={`Background ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className={`${mobileAvatarTab === "variants" ? "block" : "hidden"} lg:block`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-mono text-fg-muted uppercase tracking-wider block">
                    Quick Variants
                  </label>
                  <button
                    type="button"
                    onClick={() => setVariantShuffleNonce((n) => n + 1)}
                    className="h-7 px-2.5 text-[11px] font-semibold border border-line rounded-md hover:border-green/50 hover:text-green transition-colors"
                  >
                    Shuffle 5
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {quickVariantUrls.map((url, index) => {
                    const seed = quickVariantSeeds[index];
                    const failed = Boolean(failedPreviewUrls[url]);
                    return (
                      <button
                        key={`${seed}-${index}`}
                        type="button"
                        onClick={() => setAvatarSeed(seed)}
                        className="aspect-square rounded-lg border border-line overflow-hidden bg-bg-above/40 hover:border-green/40 transition-colors"
                        title={seed}
                      >
                        {failed ? (
                          <span className="w-full h-full flex items-center justify-center text-[11px] font-mono text-fg-muted">
                            {initials}
                          </span>
                        ) : (
                          <img
                            src={url}
                            alt={`Variant ${index + 1}`}
                            loading="lazy"
                            onError={() =>
                              setFailedPreviewUrls((prev) => ({
                                ...prev,
                                [url]: true,
                              }))
                            }
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="hidden lg:flex flex-wrap gap-2 pt-1 border-t border-line/70">
                <button
                  type="button"
                  onClick={handleSaveAvatar}
                  disabled={savingAvatar}
                  className="h-10 px-4 text-[13px] font-semibold bg-green text-white rounded-md hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {savingAvatar ? "Saving..." : "Apply Avatar"}
                </button>
                <button
                  type="button"
                  onClick={handleUseProviderPhoto}
                  disabled={savingAvatar}
                  className="h-10 px-4 text-[13px] font-medium text-fg-muted border border-line rounded-md hover:text-fg hover:border-green/40 transition-all disabled:opacity-50"
                >
                  Use Google Photo
                </button>
                <button
                  type="button"
                  onClick={handleUseInitials}
                  disabled={savingAvatar}
                  className="h-10 px-4 text-[13px] font-medium text-fg-muted border border-line rounded-md hover:text-fg transition-all disabled:opacity-50"
                >
                  Use Initials
                </button>
                <button
                  type="button"
                  onClick={handleCopyAvatarLink}
                  className="h-10 px-4 text-[13px] font-medium text-fg-muted border border-line rounded-md hover:text-fg hover:border-green/30 transition-all"
                >
                  Copy Avatar Link
                </button>
              </div>
            </div>
          </div>

          {isStudioOpen && !mobileKeyboardOpen ? (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-bg/95 backdrop-blur-sm p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-4xl mx-auto">
              <button
                type="button"
                onClick={handleUseProviderPhoto}
                disabled={savingAvatar}
                className="h-10 px-2 text-[11px] font-medium text-fg-muted border border-line rounded-md hover:text-fg hover:border-green/40 transition-all disabled:opacity-50"
              >
                Google
              </button>
              <button
                type="button"
                onClick={handleUseInitials}
                disabled={savingAvatar}
                className="h-10 px-2 text-[11px] font-medium text-fg-muted border border-line rounded-md hover:text-fg transition-all disabled:opacity-50"
              >
                Initials
              </button>
              <button
                type="button"
                onClick={handleCopyAvatarLink}
                className="h-10 px-2 text-[11px] font-medium text-fg-muted border border-line rounded-md hover:text-fg hover:border-green/30 transition-all"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleSaveAvatar}
                disabled={savingAvatar}
                className="h-10 px-2 text-[11px] font-semibold bg-green text-white rounded-md hover:opacity-90 transition-all disabled:opacity-50"
              >
                {savingAvatar ? "Saving..." : "Apply"}
              </button>
            </div>
            </div>
          ) : null}
          </div>
        </details>
      </motion.div>

      {/* ── Performance overview ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45 }}
        className="border border-line rounded-lg overflow-hidden"
      >
        <div className="h-9 flex items-center px-3 border-b border-line bg-bg-above/40 text-[11px] font-mono text-fg-muted uppercase tracking-wider">
          Performance
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line">
          {[
            { label: "Markets Joined", val: "23", color: "text-fg" },
            { label: "Won", val: "15", color: "text-green" },
            { label: "Lost", val: "6", color: "text-red" },
            { label: "Pending", val: "2", color: "text-amber" },
          ].map((s, i) => (
            <div key={i} className="bg-bg p-4">
              <span className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">
                {s.label}
              </span>
              <span className={`text-[26px] font-mono font-bold tabular-nums block mt-1 ${s.color}`}>
                {s.val}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Extended stats ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.45 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-6"
      >
        {/* Win rate + streak */}
        <div className="border border-line rounded-lg overflow-hidden">
          <div className="h-9 flex items-center px-3 border-b border-line bg-bg-above/40 text-[11px] font-mono text-fg-muted uppercase tracking-wider">
            Win Rate
          </div>
          <div className="p-5">
            <div className="flex items-end gap-3 mb-4">
              <span className="text-[40px] font-mono font-bold text-green tabular-nums leading-none">
                65%
              </span>
              <span className="text-[13px] font-mono text-fg-muted pb-1">15 of 23</span>
            </div>
            {/* Visual bar */}
            <div className="h-3 flex overflow-hidden rounded-full mb-3">
              <motion.div
                className="bg-green"
                initial={{ width: 0 }}
                animate={{ width: "65%" }}
                transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.div
                className="bg-red"
                initial={{ width: 0 }}
                animate={{ width: "26%" }}
                transition={{ delay: 0.45, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
              <div className="bg-bg-above flex-1" />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-fg-muted">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green" /> Won
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red" /> Lost
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-bg-above" /> Pending
              </span>
            </div>
          </div>
        </div>

        {/* Earnings + streak */}
        <div className="border border-line rounded-lg overflow-hidden">
          <div className="h-9 flex items-center px-3 border-b border-line bg-bg-above/40 text-[11px] font-mono text-fg-muted uppercase tracking-wider">
            Earnings & Streak
          </div>
          <div className="p-5 space-y-4">
            <div>
              <span className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">Total Earned</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[28px] font-mono font-bold text-green tabular-nums">8,450</span>
                <span className="text-[14px] font-mono text-fg-muted">KES</span>
              </div>
            </div>
            <div className="border-t border-line pt-4">
              <span className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">Current Streak</span>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[28px] font-mono font-bold text-amber tabular-nums">4</span>
                <div className="flex items-center gap-1">
                  {[true, true, true, true, false, false, false].map((won, i) => (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-mono font-bold ${
                        won ? "bg-green/15 text-green" : "bg-bg-above text-fg-muted"
                      }`}
                    >
                      {won ? "W" : "·"}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-line pt-4">
              <span className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">Avg. Stake</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[22px] font-mono font-bold tabular-nums">1,250</span>
                <span className="text-[13px] font-mono text-fg-muted">KES</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Category breakdown ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.45 }}
        className="border border-line rounded-lg overflow-hidden"
      >
        <div className="h-9 flex items-center px-3 border-b border-line bg-bg-above/40 text-[11px] font-mono text-fg-muted uppercase tracking-wider">
          Category Breakdown
        </div>
        <div className="divide-y divide-line">
          {[
            { cat: "Personal", count: 12, won: 9, rate: 75 },
            { cat: "Sports", count: 7, won: 4, rate: 57 },
            { cat: "Finance", count: 3, won: 1, rate: 33 },
            { cat: "Politics", count: 1, won: 1, rate: 100 },
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-[13px] font-medium w-24">{c.cat}</span>
              <div className="flex-1 h-2 bg-bg-above rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-green rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${c.rate}%` }}
                  transition={{ delay: 0.4 + i * 0.08, duration: 0.6 }}
                />
              </div>
              <div className="flex items-center gap-3 text-[12px] font-mono text-fg-muted shrink-0">
                <span>{c.won}/{c.count}</span>
                <span className={`font-bold ${c.rate >= 50 ? "text-green" : "text-red"}`}>
                  {c.rate}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Account actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.45 }}
        className="border border-red/20 rounded-lg overflow-hidden"
      >
        <div className="h-9 flex items-center px-3 border-b border-red/20 bg-red/5 text-[11px] font-mono text-red uppercase tracking-wider font-semibold">
          Danger Zone
        </div>
        <div className="p-4 flex items-center gap-3">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="h-9 px-4 text-[13px] font-medium text-fg-muted border border-line rounded-md hover:text-red hover:border-red/40 hover:bg-red/5 transition-all"
          >
            Sign out
          </button>
          <button
            onClick={() => toast("warning", "Are you sure?", "Account deletion is permanent. Contact support to proceed.")}
            className="h-9 px-4 text-[13px] font-medium text-fg-muted border border-line rounded-md hover:text-red hover:border-red/40 hover:bg-red/5 transition-all"
          >
            Delete account
          </button>
        </div>
      </motion.div>
    </div>
  );
}
