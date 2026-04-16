import Link from "next/link";
import { getAllMarketOddsAction } from "@/actions/market";
import { MarketsClient } from "@/components/markets/markets-client";
import markets from "@/data/markets.json";

export const metadata = {
  title: "Markets | StakePesa",
  description: "Browse live prediction markets. Bet on real outcomes — sports, politics, finance, and more.",
};

export default async function MarketsPage() {
  const { snapshots } = await getAllMarketOddsAction();

  // Merge static market metadata with live odds
  const enriched = markets.markets.map((market) => {
    const snap = snapshots?.find((s) => s.marketId === market.id);
    return {
      id: market.id,
      title: market.title,
      category: market.category,
      options: market.options,
      totalPoolCents: snap?.totalPoolCents ?? 0,
      houseRevenueCents: snap?.houseRevenueCents ?? 0,
      hasLiveOdds: snap?.hasLiveOdds ?? false,
      outcomes: snap?.outcomes ?? market.options.map((o) => ({
        outcome: o.name,
        poolCents: 0,
        poolPercentage: parseFloat((100 / market.options.length).toFixed(2)),
        decimalOdds: parseFloat(market.options.length.toFixed(2)),
        impliedProbability: parseFloat((o.probability).toFixed(4)),
        netMultiplier: parseFloat((market.options.length - 1).toFixed(2)),
        hasAction: false,
      })),
    };
  });

  return <MarketsClient markets={enriched} />;
}
