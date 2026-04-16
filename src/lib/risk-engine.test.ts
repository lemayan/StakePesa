import test from "node:test"
import assert from "node:assert/strict"
import {
  assessBetRisk,
  calculatePoolImbalance,
  describeImbalance,
} from "@/lib/risk-engine"

test("risk engine blocks concentrated single-outcome exposure", () => {
  const assessment = assessBetRisk({
    userId: "u1",
    marketId: "epl_winner",
    outcome: "A",
    stakeCents: 100_000,
    currentPools: { A: 800_000, B: 100_000, C: 100_000 },
    userExistingStakeOnOutcome: 10_000,
    houseMarginBps: 500,
    marketClosesAt: new Date(Date.now() + 60 * 60 * 1000),
  })

  assert.equal(assessment.level, "BLOCKED")
  assert.ok(assessment.flags.some((f) => f.code === "OUTCOME_CONCENTRATION"))
})

test("risk engine flags late surge without blocking by default", () => {
  const assessment = assessBetRisk({
    userId: "u2",
    marketId: "custom_market",
    outcome: "YES",
    stakeCents: 600_000,
    currentPools: { YES: 900_000, NO: 900_000 },
    userExistingStakeOnOutcome: 20_000,
    houseMarginBps: 500,
    marketClosesAt: new Date(Date.now() + 10 * 60 * 1000),
  })

  assert.equal(assessment.level, "FLAGGED")
  assert.ok(assessment.flags.some((f) => f.code === "LATE_SURGE_DETECTED"))
})

test("maxAllowedStakeCents never returns negative", () => {
  const assessment = assessBetRisk({
    userId: "u3",
    marketId: "custom_market",
    outcome: "YES",
    stakeCents: 5_000,
    currentPools: { YES: 90_000_000, NO: 10_000_000 },
    userExistingStakeOnOutcome: 0,
    houseMarginBps: 500,
    marketClosesAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  })

  assert.ok(assessment.maxAllowedStakeCents >= 0)
})

test("imbalance helpers return stable classifications", () => {
  const balanced = calculatePoolImbalance({ A: 100, B: 100, C: 100 })
  const skewed = calculatePoolImbalance({ A: 295, B: 3, C: 2 })

  assert.ok(balanced < skewed)
  assert.equal(describeImbalance(0.1), "Well balanced")
  assert.equal(describeImbalance(0.9), "Extremely concentrated")
})
