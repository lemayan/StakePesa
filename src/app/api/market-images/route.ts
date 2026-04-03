/**
 * GET /api/market-images?marketIds=id1,id2,...
 *
 * Returns entity image data for all options in the requested markets.
 * Triggers background image fetch for options not yet in DB.
 *
 * Uses raw SQL queries to bypass Prisma's old locked client DLL validation
 * for the new entityType and imageShape fields.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { queueMarketImages } from "@/lib/image-queue";
import marketsData from "@/data/markets.json";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("marketIds") ?? "";
  const requestedIds = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allMarkets = marketsData.markets as Array<{
    id: string;
    category: string;
    options: Array<{ name: string; probability: number }>;
  }>;

  const filteredMarkets =
    requestedIds.length > 0
      ? allMarkets.filter((m) => requestedIds.includes(m.id))
      : allMarkets;

  if (filteredMarkets.length === 0) {
    return NextResponse.json({ images: {} });
  }

  const marketIds = filteredMarkets.map((m) => m.id);

  // Raw SQL query — bypasses old Prisma DLL validation for new fields
  const placeholders = marketIds.map((_, i) => `$${i + 1}`).join(", ");
  const dbRecords = await db.$queryRawUnsafe<
    Array<{
      market_id: string;
      option_name: string;
      entity_type: string;
      image_url: string | null;
      image_source: string | null;
      image_verified: boolean;
      image_shape: string | null;
    }>
  >(
    `SELECT "marketId" as market_id, "optionName" as option_name,
            "entityType" as entity_type, "imageUrl" as image_url,
            "imageSource" as image_source, "imageVerified" as image_verified,
            "imageShape" as image_shape
     FROM "MarketOption"
     WHERE "marketId" IN (${placeholders})`,
    ...marketIds
  );

  // Build response map
  const imagesMap: Record<
    string,
    Record<
      string,
      {
        entityType: string;
        imageUrl: string | null;
        imageSource: string | null;
        imageVerified: boolean;
        imageShape: string | null;
      }
    >
  > = {};

  for (const row of dbRecords) {
    if (!imagesMap[row.market_id]) imagesMap[row.market_id] = {};
    imagesMap[row.market_id][row.option_name] = {
      entityType: row.entity_type || "GENERIC",
      imageUrl: row.image_url,
      imageSource: row.image_source,
      imageVerified: Boolean(row.image_verified),
      imageShape: row.image_shape,
    };
  }

  // Queue background fetch for any options not yet in DB
  for (const market of filteredMarkets) {
    const existing = imagesMap[market.id] ?? {};
    const missingOptions = market.options
      .map((o) => o.name)
      .filter((name) => !existing[name]);

    if (missingOptions.length > 0) {
      queueMarketImages(market.id, market.category, missingOptions);
    }
  }

  return NextResponse.json({ images: imagesMap });
}
