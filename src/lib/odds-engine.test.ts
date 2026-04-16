import test from "node:test"
import assert from "node:assert/strict"
import {
  calculateTotalPool,
  calculatePrizePool,
  calculateHouseRevenue,
  calculateMarketOdds,
  calculateWinnerPayout,
  estimatePotentialPayout,
} from "@/lib/odds-engine"

test("odds engine preserves pool identity: prize + house = total", () => {
  const pools = { YES: 120_000, NO: 80_000 }
  const total = calculateTotalPool(pools)
  const prize = calculatePrizePool(total, 500)
  const house = calculateHouseRevenue(total, 500)

  assert.equal(total, 200_000)
  assert.equal(prize + house, total)
})

test("market odds rank larger pools with lower odds", () => {
  const snapshot = calculateMarketOdds("test_market", {
    A: 150_000,
    B: 50_000,
  }, 500)

  const a = snapshot.outcomes.find((o) => o.outcome === "A")
  const b = snapshot.outcomes.find((o) => o.outcome === "B")

  assert.ok(a)
  assert.ok(b)
  assert.ok((a?.decimalOdds ?? 0) < (b?.decimalOdds ?? 0))
})

test("winner payout is proportional to winning pool share", () => {
  const payout = calculateWinnerPayout(
    20_000,
    100_000,
    200_000,
    500
  )

  // prize pool = 190000, user owns 20% of winning pool => 38000 return
  assert.equal(payout.totalReturnCents, 38_000)
  assert.equal(payout.profitCents, 18_000)
  assert.equal(payout.houseFeeCents, 10_000)
})

test("estimatePotentialPayout projects stake-inclusive odds", () => {
  const estimate = estimatePotentialPayout(
    10_000,
    { YES: 40_000, NO: 60_000 },
    "YES",
    500
  )

  assert.ok(estimate.currentOdds > 1)
  assert.ok(estimate.estimatedReturn >= 0)
  assert.equal(
    estimate.estimatedReturn - 10_000,
    estimate.estimatedProfit
  )
})
