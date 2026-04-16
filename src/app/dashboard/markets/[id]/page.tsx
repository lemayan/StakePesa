import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getMarketOddsAction } from "@/actions/market";
import { getWalletBalance } from "@/lib/wallet";
import { MarketDetailClient } from "@/components/markets/market-detail-client";
import { getMarketCatalogById } from "@/lib/market-catalog";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const market = await getMarketCatalogById(id);
  if (!market) return { title: "Market Not Found | StakePesa" };
  return {
    title: `${market.title} | StakePesa Markets`,
    description: `Place your bet on "${market.title}". Live pari-mutuel odds powered by StakePesa.`,
  };
}

export default async function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const staticMarket = await getMarketCatalogById(id);
  if (!staticMarket) notFound();

  const session = await auth();
  const userId = session?.user?.id;

  const [oddsResult, walletBalance] = await Promise.all([
    getMarketOddsAction(id),
    userId ? getWalletBalance(userId) : Promise.resolve(0),
  ]);

  const snapshot = oddsResult.success ? oddsResult.snapshot : null;

  const outcomes = snapshot?.outcomes ?? staticMarket.options.map((o) => ({
    outcome: o.name,
    poolCents: 0,
    poolPercentage: parseFloat((o.probability * 100).toFixed(2)),
    decimalOdds: parseFloat((1 / o.probability).toFixed(2)),
    impliedProbability: o.probability,
    netMultiplier: parseFloat((1 / o.probability - 1).toFixed(2)),
    hasAction: false,
  }));

  return (
    <MarketDetailClient
      market={staticMarket}
      outcomes={outcomes}
      totalPoolCents={snapshot?.totalPoolCents ?? 0}
      prizePoolCents={snapshot?.prizePoolCents ?? 0}
      houseRevenueCents={snapshot?.houseRevenueCents ?? 0}
      houseMarginBps={snapshot?.houseMarginBps ?? 500}
      hasLiveOdds={snapshot?.hasLiveOdds ?? false}
      walletBalanceCents={walletBalance}
      isLoggedIn={!!userId}
    />
  );
}
