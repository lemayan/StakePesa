/**
 * POST /api/admin/seed-images
 *
 * Clears ALL existing MarketOption records and re-seeds every option
 * using the new entity-type-aware image resolution system.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/admin/seed-images
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEntityImage } from "@/lib/candidate-image";
import marketsData from "@/data/markets.json";

export async function POST() {
  const markets = marketsData.markets as Array<{
    id: string;
    title: string;
    category: string;
    options: Array<{ name: string }>;
  }>;

  // ── 1. Clear all existing records ─────────────────────────────────────────
  const deleted = await (db as any).marketOption.deleteMany({});
  console.log(`[seed-images] Cleared ${deleted.count} existing records`);

  // ── 2. Re-seed with entity-aware logic ────────────────────────────────────
  const results: Array<{
    marketId: string;
    optionName: string;
    entityType: string;
    imageUrl: string | null;
    imageSource: string | null;
    imageVerified: boolean;
    imageShape: string | null;
  }> = [];

  const errors: Array<{
    marketId: string;
    optionName: string;
    error: string;
  }> = [];

  for (const market of markets) {
    for (const option of market.options) {
      try {
        const result = await getEntityImage(market.id, option.name, market.category);
        results.push({
          marketId: market.id,
          optionName: option.name,
          entityType: result.entityType,
          imageUrl: result.imageUrl,
          imageSource: result.imageSource,
          imageVerified: result.imageVerified,
          imageShape: result.imageShape,
        });
        // Respect Wikimedia rate limits
        await new Promise((r) => setTimeout(r, 150));
      } catch (err) {
        errors.push({
          marketId: market.id,
          optionName: option.name,
          error: String(err),
        });
      }
    }
  }

  return NextResponse.json({
    cleared: deleted.count,
    seeded: results.length,
    errors: errors.length,
    results,
    ...(errors.length > 0 ? { errorDetails: errors } : {}),
  });
}
