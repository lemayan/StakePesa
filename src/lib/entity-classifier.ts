/**
 * entity-classifier.ts
 *
 * Pure, deterministic classification of market option names into EntityType.
 * No external calls — runs synchronously during image resolution.
 *
 * Classification order (first match wins):
 *  1. GENERIC  — option is a binary/vague answer
 *  2. PERSON   — name matches known politician/athlete/public figure
 *  3. CRYPTO   — name matches known cryptocurrency
 *  4. SPORTS_TEAM — name matches known team or category is sports with 1-word proper noun
 *  5. COMPETITION — name suggests a league/tournament
 *  6. PERSON   — category is politics and name looks like a person
 *  7. GENERIC  — fallback
 */

export type EntityType =
  | "PERSON"
  | "SPORTS_TEAM"
  | "COMPETITION"
  | "CRYPTO"
  | "GENERIC";

// ─── Generic / binary answer words ────────────────────────────────────────────

const GENERIC_NAMES = new Set([
  "yes", "no", "other", "maybe", "none", "unknown",
  "opposition candidate", "other candidate", "the field",
]);

// ─── Known persons ─────────────────────────────────────────────────────────────
// Lowercase partial matches — order matters, more specific first.

const KNOWN_PERSONS: string[] = [
  // Kenya politics
  "william ruto", "ruto",
  "rigathi gachagua", "gachagua",
  "musalia mudavadi", "mudavadi",
  "kalonzo musyoka", "kalonzo",
  "johnson sakaja", "sakaja",
  "babu owino",
  "peter munya",
  "george wajackoyah",
  "martha karua",
  "wycliffe oparanya",
  // Kenya sports
  "eliud kipchoge", "kipchoge",
  "faith kipyegon", "kipyegon",
  "vivian cheruiyot",
  "michael olunga", "olunga",
  "victor wanyama", "wanyama",
  "harambee stars",   // treated as PERSON entity (national team — handled below)
  // International
  "lionel messi", "messi",
  "cristiano ronaldo", "ronaldo",
  "erling haaland", "haaland",
  "kylian mbappe", "mbappe",
];

// ─── Known sports teams ────────────────────────────────────────────────────────

const KNOWN_SPORTS_TEAMS: string[] = [
  // EPL
  "arsenal", "manchester city", "man city", "liverpool", "chelsea",
  "manchester united", "man united", "tottenham", "spurs",
  "newcastle", "aston villa", "west ham", "brighton",
  // NBA
  "denver nuggets", "nuggets",
  "boston celtics", "celtics",
  "okc thunder", "oklahoma city thunder", "thunder",
  "golden state warriors", "warriors",
  "los angeles lakers", "lakers",
  "miami heat", "heat",
  "milwaukee bucks", "bucks",
  // Football international
  "real madrid", "barcelona", "psg", "paris saint-germain",
  "bayern munich", "juventus", "ac milan", "inter milan",
  "dortmund", "atletico madrid",
  // African football
  "al ahly", "esperance", "wydad",
];

// ─── Known competitions / leagues ─────────────────────────────────────────────

const KNOWN_COMPETITIONS: string[] = [
  "premier league", "english premier league", "epl",
  "champions league", "europa league",
  "nba", "nfl", "mlb", "nhl",
  "afcon", "africa cup of nations",
  "world cup", "copa america", "euro",
  "la liga", "serie a", "bundesliga", "ligue 1",
  "diamond league",
];

// ─── Known crypto ──────────────────────────────────────────────────────────────

const KNOWN_CRYPTO: string[] = [
  "bitcoin", "btc",
  "ethereum", "eth",
  "solana", "sol",
  "binance coin", "bnb",
  "cardano", "ada",
  "ripple", "xrp",
  "dogecoin", "doge",
  "polkadot", "dot",
  "avalanche", "avax",
  "chainlink", "link",
  "shiba inu", "shib",
  "litecoin", "ltc",
  "uniswap", "uni",
];

// ─── Classifier ───────────────────────────────────────────────────────────────

/**
 * Classify a market option name into an EntityType.
 *
 * @param name           The option name from markets.json (e.g. "William Ruto")
 * @param marketCategory The market's category (e.g. "politics", "sports", "crypto")
 */
export function classifyEntity(
  name: string,
  marketCategory: string
): EntityType {
  const lower = name.toLowerCase().trim();
  const cat = marketCategory.toLowerCase().trim();

  // ── 1. Generic binary / vague answers ───────────────────────────────────────
  if (GENERIC_NAMES.has(lower)) return "GENERIC";
  // Single-word simple answers
  if (/^(yes|no|other|maybe|none)$/i.test(lower)) return "GENERIC";

  // ── 2. Known crypto ──────────────────────────────────────────────────────────
  if (KNOWN_CRYPTO.some((c) => lower === c || lower.includes(c))) {
    return "CRYPTO";
  }
  if (cat === "crypto") return "CRYPTO"; // all options in crypto markets

  // ── 3. Known competitions ────────────────────────────────────────────────────
  if (KNOWN_COMPETITIONS.some((c) => lower.includes(c))) return "COMPETITION";

  // ── 4. Known sports teams ────────────────────────────────────────────────────
  if (KNOWN_SPORTS_TEAMS.some((t) => lower === t || lower.includes(t))) {
    return "SPORTS_TEAM";
  }

  // ── 5. Known persons ─────────────────────────────────────────────────────────
  if (KNOWN_PERSONS.some((p) => lower === p || lower.includes(p))) {
    return "PERSON";
  }

  // ── 6. Category-based heuristics ─────────────────────────────────────────────

  if (cat === "politics") {
    // Multi-word title-case name in politics → almost certainly a person
    const words = name.trim().split(/\s+/);
    const looksLikeName =
      words.length >= 2 &&
      words.every((w) => w.length > 0 && w[0] === w[0].toUpperCase());
    if (looksLikeName) return "PERSON";
  }

  if (cat === "sports") {
    // 1-word proper noun in sports → likely a team
    const words = name.trim().split(/\s+/);
    if (words.length === 1 && name[0] === name[0].toUpperCase()) {
      return "SPORTS_TEAM";
    }
    // Multi-word with "FC", "City", "United" → team
    if (/\b(fc|city|united|club|cf|sc|ac)\b/i.test(lower)) {
      return "SPORTS_TEAM";
    }
  }

  // ── 7. Generic fallback ──────────────────────────────────────────────────────
  return "GENERIC";
}

/**
 * Returns the correct imageShape for a given entity type.
 * - PERSON → 'circle' (face photos)
 * - SPORTS_TEAM / COMPETITION / CRYPTO → 'square' (logos)
 * - GENERIC → null (no image rendered)
 */
export function getImageShape(
  entityType: EntityType
): "circle" | "square" | null {
  switch (entityType) {
    case "PERSON":      return "circle";
    case "SPORTS_TEAM": return "square";
    case "COMPETITION": return "square";
    case "CRYPTO":      return "square";
    case "GENERIC":     return null;
  }
}
