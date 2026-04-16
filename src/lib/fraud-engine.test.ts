import test from "node:test"
import assert from "node:assert/strict"
import { assessBetFraud } from "@/lib/fraud-engine"

test("fraud engine blocks extreme bet velocity", () => {
  const assessment = assessBetFraud({
    userId: "u1",
    marketId: "m1",
    outcome: "YES",
    stakeCents: 100_000,
    betsLast2Min: 2,
    betsLast5Min: 8,
    betsLast15Min: 9,
    sameMarketBetsLast2Min: 2,
    identicalStakeCountLast15Min: 1,
    stakeLast5MinCents: 400_000,
  })

  assert.equal(assessment.level, "BLOCKED")
  assert.ok(assessment.flags.some((f) => f.code === "FRAUD_BET_VELOCITY_EXCEEDED"))
})

test("fraud engine flags repeated identical stake patterns", () => {
  const assessment = assessBetFraud({
    userId: "u2",
    marketId: "m2",
    outcome: "NO",
    stakeCents: 50_000,
    betsLast2Min: 1,
    betsLast5Min: 3,
    betsLast15Min: 5,
    sameMarketBetsLast2Min: 1,
    identicalStakeCountLast15Min: 3,
    stakeLast5MinCents: 150_000,
  })

  assert.equal(assessment.level, "FLAGGED")
  assert.ok(assessment.flags.some((f) => f.code === "FRAUD_IDENTICAL_STAKE_PATTERN"))
})

test("fraud engine stays clear for normal activity", () => {
  const assessment = assessBetFraud({
    userId: "u3",
    marketId: "m3",
    outcome: "A",
    stakeCents: 20_000,
    betsLast2Min: 0,
    betsLast5Min: 1,
    betsLast15Min: 2,
    sameMarketBetsLast2Min: 0,
    identicalStakeCountLast15Min: 0,
    stakeLast5MinCents: 20_000,
  })

  assert.equal(assessment.level, "CLEAR")
  assert.equal(assessment.flags.length, 0)
})
