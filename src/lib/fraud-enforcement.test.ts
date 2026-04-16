import test from "node:test"
import assert from "node:assert/strict"
import { deriveFraudCooldown, getActiveCooldown } from "@/lib/fraud-enforcement"

test("derives 15-minute cooldown after 3 blocked attempts in 20 minutes", () => {
  const now = new Date("2026-04-16T12:00:00.000Z")
  const blocked = [
    new Date("2026-04-16T11:45:00.000Z"),
    new Date("2026-04-16T11:50:00.000Z"),
    new Date("2026-04-16T11:55:00.000Z"),
  ]

  const cooldown = deriveFraudCooldown(blocked, now)
  assert.ok(cooldown)
  assert.equal(cooldown?.cooldownMinutes, 15)
})

test("escalates to 60-minute cooldown after 5 blocked attempts in 60 minutes", () => {
  const now = new Date("2026-04-16T12:00:00.000Z")
  const blocked = [
    new Date("2026-04-16T11:10:00.000Z"),
    new Date("2026-04-16T11:20:00.000Z"),
    new Date("2026-04-16T11:30:00.000Z"),
    new Date("2026-04-16T11:40:00.000Z"),
    new Date("2026-04-16T11:50:00.000Z"),
  ]

  const cooldown = deriveFraudCooldown(blocked, now)
  assert.ok(cooldown)
  assert.equal(cooldown?.cooldownMinutes, 60)
})

test("active cooldown returns positive retryAfterSeconds", () => {
  const now = new Date("2026-04-16T12:00:00.000Z")
  const expiresAt = new Date("2026-04-16T12:05:00.000Z")

  const active = getActiveCooldown(expiresAt, now)
  assert.ok(active)
  assert.equal(active?.retryAfterSeconds, 300)
})
