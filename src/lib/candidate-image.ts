/**
 * candidate-image.ts  (v2 — entity-type-aware)
 *
 * Resolves the correct image for every market option based on its EntityType.
 *
 * ┌──────────────┬──────────────────────────────────────────────────────────┐
 * │ EntityType   │ Image Strategy                                           │
 * ├──────────────┼──────────────────────────────────────────────────────────┤
 * │ PERSON       │ Wikimedia face photo → DiceBear portrait (circle)        │
 * │ SPORTS_TEAM  │ Hardcoded logo map → Wikipedia logo → initials (square)  │
 * │ COMPETITION  │ Wikipedia logo image → initials (square)                 │
 * │ CRYPTO       │ CoinGecko public API logo (square)                       │
 * │ GENERIC      │ imageUrl = null — rendered as answer chip, no fetch      │
 * └──────────────┴──────────────────────────────────────────────────────────┘
 */

import { db } from "@/lib/db";
import {
  classifyEntity,
  getImageShape,
  type EntityType,
} from "@/lib/entity-classifier";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImageSourceType = "WIKIMEDIA" | "AI" | "MANUAL";

export interface EntityImageResult {
  entityType: EntityType;
  imageUrl: string | null; // null for GENERIC
  imageSource: ImageSourceType | null;
  imageVerified: boolean;
  imageShape: "circle" | "square" | null;
}

// ─── Wikimedia (persons + competition logos) ───────────────────────────────────

async function fetchWikimediaImage(name: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(name);
    const url =
      `https://en.wikipedia.org/w/api.php` +
      `?action=query&titles=${encoded}&prop=pageimages&format=json&pithumbsize=400&origin=*`;

    const res = await fetch(url, {
      headers: { "User-Agent": "StakePesa/2.0 (contact@stakepesa.com)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const pages: Record<string, { thumbnail?: { source: string } }> =
      data?.query?.pages ?? {};

    for (const page of Object.values(pages)) {
      if (page.thumbnail?.source) return page.thumbnail.source;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── CoinGecko (crypto logos, free public API) ────────────────────────────────

/** Map common coin names/tickers → CoinGecko coin IDs */
const COINGECKO_IDS: Record<string, string> = {
  bitcoin: "bitcoin", btc: "bitcoin",
  ethereum: "ethereum", eth: "ethereum",
  solana: "solana", sol: "solana",
  "binance coin": "binancecoin", bnb: "binancecoin",
  cardano: "cardano", ada: "cardano",
  ripple: "ripple", xrp: "ripple",
  dogecoin: "dogecoin", doge: "dogecoin",
  polkadot: "polkadot", dot: "polkadot",
  avalanche: "avalanche-2", avax: "avalanche-2",
  chainlink: "chainlink", link: "chainlink",
  litecoin: "litecoin", ltc: "litecoin",
  uniswap: "uniswap", uni: "uniswap",
  "shiba inu": "shiba-inu", shib: "shiba-inu",
};

async function fetchCoinGeckoLogo(name: string): Promise<string | null> {
  try {
    const coinId = COINGECKO_IDS[name.toLowerCase().trim()];
    if (!coinId) return null;

    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 * 7 }, // logos rarely change
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.image?.small as string) ?? null;
  } catch {
    return null;
  }
}

// ─── Sports team logos ────────────────────────────────────────────────────────
//
// Wikipedia serves stable, high-quality SVG/PNG crests for all major clubs.
// These URLs are from Wikipedia Commons and publicly cached at scale.
//

const TEAM_LOGO_MAP: Record<string, string> = {
  // English Premier League
  arsenal:
    "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
  "manchester city":
    "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg",
  "man city":
    "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg",
  liverpool:
    "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg",
  chelsea:
    "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg",
  "manchester united":
    "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg",
  "man united":
    "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg",
  tottenham:
    "https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg",
  spurs:
    "https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg",
  // NBA
  "denver nuggets":
    "https://upload.wikimedia.org/wikipedia/en/7/76/Denver_Nuggets.svg",
  nuggets:
    "https://upload.wikimedia.org/wikipedia/en/7/76/Denver_Nuggets.svg",
  "boston celtics":
    "https://upload.wikimedia.org/wikipedia/en/8/8f/Boston_Celtics.svg",
  celtics:
    "https://upload.wikimedia.org/wikipedia/en/8/8f/Boston_Celtics.svg",
  "okc thunder":
    "https://upload.wikimedia.org/wikipedia/en/5/5d/Oklahoma_City_Thunder.svg",
  "oklahoma city thunder":
    "https://upload.wikimedia.org/wikipedia/en/5/5d/Oklahoma_City_Thunder.svg",
  thunder:
    "https://upload.wikimedia.org/wikipedia/en/5/5d/Oklahoma_City_Thunder.svg",
  "golden state warriors":
    "https://upload.wikimedia.org/wikipedia/en/0/01/Golden_State_Warriors_logo.svg",
  warriors:
    "https://upload.wikimedia.org/wikipedia/en/0/01/Golden_State_Warriors_logo.svg",
  "los angeles lakers":
    "https://upload.wikimedia.org/wikipedia/commons/3/3c/Los_Angeles_Lakers_logo.svg",
  lakers:
    "https://upload.wikimedia.org/wikipedia/commons/3/3c/Los_Angeles_Lakers_logo.svg",

  // African football
  "harambee stars":
    "https://upload.wikimedia.org/wikipedia/en/b/b0/Football_Kenya_Federation_logo.svg",
};

function getTeamLogo(name: string): string | null {
  const lower = name.toLowerCase().trim();
  return TEAM_LOGO_MAP[lower] ?? null;
}

// ─── Local manual images (checked before Wikimedia) ─────────────────────────
//
// Drop image files into: public/images/figures/
// Then re-seed: POST /api/admin/seed-images
//
// Keys = lowercase name fragments (partial match). Values = /images/figures/ paths.
// Omit any entry if you haven't added the file yet — Wikimedia handles the rest.
//

const LOCAL_PERSON_MAP: Record<string, string> = {
  // Kenya politics
  "william ruto":     "/images/figures/ruto.jpg",
  ruto:               "/images/figures/ruto.jpg",
  "johnson sakaja":   "/images/figures/sakaja.jpg",
  sakaja:             "/images/figures/sakaja.jpg",
  "babu owino":       "/images/figures/babu.jpg",
  babu:               "/images/figures/babu.jpg",
  "rigathi gachagua": "/images/figures/gachagua.jpg",
  gachagua:           "/images/figures/gachagua.jpg",
  "musalia mudavadi": "/images/figures/mudavadi.jpg",
  mudavadi:           "/images/figures/mudavadi.jpg",
  "kalonzo musyoka":  "/images/figures/kalonzo.jpg",
  kalonzo:            "/images/figures/kalonzo.jpg",
  "martha karua":     "/images/figures/karua.jpg",
  karua:              "/images/figures/karua.jpg",
  // Kenya sports
  "eliud kipchoge":   "/images/figures/kipchoge.jpg",
  kipchoge:           "/images/figures/kipchoge.jpg",
  "faith kipyegon":   "/images/figures/kipyegon.jpg",
  kipyegon:           "/images/figures/kipyegon.jpg",
  "michael olunga":   "/images/figures/olunga.jpg",
  olunga:             "/images/figures/olunga.jpg",
  "victor wanyama":   "/images/figures/wanyama.jpg",
  wanyama:            "/images/figures/wanyama.jpg",
};

/** Returns local /images/figures/ path if mapped; null otherwise */
function getLocalPersonImage(name: string): string | null {
  const lower = name.toLowerCase().trim();
  for (const [key, path] of Object.entries(LOCAL_PERSON_MAP)) {
    if (lower === key || lower.includes(key)) return path;
  }
  return null;
}

// ─── DiceBear (person fallback portrait) ──────────────────────────────────────

/** Deterministic portrait-style avatar for a known person whose photo isn't on Wikipedia */
function getDiceBearPersonUrl(name: string): string {
  const seed = encodeURIComponent(name.trim());
  return `https://api.dicebear.com/9.x/personas/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9&backgroundType=gradientLinear`;
}

// ─── Per-type resolution ──────────────────────────────────────────────────────

async function resolvePersonImage(
  name: string
): Promise<{ url: string; source: ImageSourceType; verified: boolean }> {
  // 1. Local manual image — highest priority
  const localUrl = getLocalPersonImage(name);
  if (localUrl) return { url: localUrl, source: "MANUAL", verified: true };

  // 2. Wikimedia face photo
  const wikiUrl = await fetchWikimediaImage(name);
  if (wikiUrl) return { url: wikiUrl, source: "WIKIMEDIA", verified: true };

  // 3. DiceBear portrait fallback (human-style illustration)
  return { url: getDiceBearPersonUrl(name), source: "AI", verified: false };
}


async function resolveSportsTeamImage(
  name: string
): Promise<{ url: string | null; source: ImageSourceType | null; verified: boolean }> {
  // 1. Hardcoded crest map (most reliable)
  const mapUrl = getTeamLogo(name);
  if (mapUrl) return { url: mapUrl, source: "MANUAL", verified: true };

  // 2. Wikipedia logo image (works for most clubs)
  const wikiUrl = await fetchWikimediaImage(`${name} F.C.`);
  if (wikiUrl) return { url: wikiUrl, source: "WIKIMEDIA", verified: true };

  const wikiUrl2 = await fetchWikimediaImage(name);
  if (wikiUrl2) return { url: wikiUrl2, source: "WIKIMEDIA", verified: true };

  // 3. No logo found — render initials in square on the frontend
  return { url: null, source: null, verified: false };
}

async function resolveCompetitionImage(
  name: string
): Promise<{ url: string | null; source: ImageSourceType | null; verified: boolean }> {
  const wikiUrl = await fetchWikimediaImage(name);
  if (wikiUrl) return { url: wikiUrl, source: "WIKIMEDIA", verified: true };
  return { url: null, source: null, verified: false };
}

async function resolveCryptoImage(
  name: string
): Promise<{ url: string | null; source: ImageSourceType | null; verified: boolean }> {
  const logo = await fetchCoinGeckoLogo(name);
  if (logo) return { url: logo, source: "WIKIMEDIA", verified: true };
  return { url: null, source: null, verified: false };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Resolves and caches the correct image for a market option.
 *
 * @param marketId       Market ID from markets.json
 * @param optionName     Option name (e.g. "William Ruto", "Arsenal", "Yes")
 * @param marketCategory Market category (e.g. "politics", "sports", "crypto")
 */
export async function getEntityImage(
  marketId: string,
  optionName: string,
  marketCategory: string
): Promise<EntityImageResult> {
  // ── 1. DB cache (raw query — bypasses old Prisma client enum validation) ────
  const rows = await db.$queryRawUnsafe<
    Array<{
      entity_type: string;
      image_url: string | null;
      image_source: string | null;
      image_verified: boolean;
      image_shape: string | null;
    }>
  >(
    `SELECT "entityType" as entity_type, "imageUrl" as image_url, "imageSource" as image_source, "imageVerified" as image_verified, "imageShape" as image_shape
     FROM "MarketOption"
     WHERE "marketId" = $1 AND "optionName" = $2
     LIMIT 1`,
    marketId,
    optionName
  );

  const cached = rows[0];
  if (cached && (cached.image_url !== null || cached.entity_type === "GENERIC")) {
    return {
      entityType: (cached.entity_type || "GENERIC") as EntityType,
      imageUrl: cached.image_url,
      imageSource: (cached.image_source || null) as ImageSourceType | null,
      imageVerified: Boolean(cached.image_verified),
      imageShape: (cached.image_shape || null) as "circle" | "square" | null,
    };
  }

  // ── 2. Classify ────────────────────────────────────────────────────────────
  const entityType = classifyEntity(optionName, marketCategory);
  const imageShape = getImageShape(entityType);

  // ── 3. Resolve per type ────────────────────────────────────────────────────
  let imageUrl: string | null = null;
  let imageSource: ImageSourceType | null = null;
  let imageVerified = false;

  switch (entityType) {
    case "PERSON": {
      const r = await resolvePersonImage(optionName);
      imageUrl = r.url;
      imageSource = r.source;
      imageVerified = r.verified;
      break;
    }
    case "SPORTS_TEAM": {
      const r = await resolveSportsTeamImage(optionName);
      imageUrl = r.url;
      imageSource = r.source;
      imageVerified = r.verified;
      break;
    }
    case "COMPETITION": {
      const r = await resolveCompetitionImage(optionName);
      imageUrl = r.url;
      imageSource = r.source;
      imageVerified = r.verified;
      break;
    }
    case "CRYPTO": {
      const r = await resolveCryptoImage(optionName);
      imageUrl = r.url;
      imageSource = r.source;
      imageVerified = r.verified;
      break;
    }
    case "GENERIC":
      imageUrl = null;
      imageSource = null;
      imageVerified = false;
      break;
  }

  // ── 4. Persist (raw SQL upsert — bypasses Prisma client enum validation) ───
  await db.$executeRawUnsafe(
    `INSERT INTO "MarketOption" ("id", "marketId", "optionName", "entityType", "imageUrl", "imageSource", "imageVerified", "imageShape", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT ("marketId", "optionName")
     DO UPDATE SET
       "entityType" = EXCLUDED."entityType",
       "imageUrl" = EXCLUDED."imageUrl",
       "imageSource" = EXCLUDED."imageSource",
       "imageVerified" = EXCLUDED."imageVerified",
       "imageShape" = EXCLUDED."imageShape",
       "updatedAt" = NOW()`,
    marketId,
    optionName,
    entityType,
    imageUrl,
    imageSource,
    imageVerified,
    imageShape
  );

  return { entityType, imageUrl, imageSource, imageVerified, imageShape };
}
