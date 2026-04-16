export interface FraudCooldownPolicy {
  blockedAttempts: number
  windowMinutes: number
  cooldownMinutes: number
}

export interface ActiveFraudCooldown {
  expiresAt: Date
  retryAfterSeconds: number
}

export const FRAUD_COOLDOWN_POLICIES: FraudCooldownPolicy[] = [
  { blockedAttempts: 3, windowMinutes: 20, cooldownMinutes: 15 },
  { blockedAttempts: 5, windowMinutes: 60, cooldownMinutes: 60 },
]

export function getMaxCooldownWindowMinutes(): number {
  return FRAUD_COOLDOWN_POLICIES.reduce((max, policy) => Math.max(max, policy.windowMinutes), 0)
}

export function deriveFraudCooldown(
  blockedAttemptTimes: Date[],
  now: Date = new Date()
): { cooldownMinutes: number; blockedAttempts: number; windowMinutes: number } | null {
  let chosen: { cooldownMinutes: number; blockedAttempts: number; windowMinutes: number } | null = null

  for (const policy of FRAUD_COOLDOWN_POLICIES) {
    const windowStart = new Date(now.getTime() - policy.windowMinutes * 60 * 1000)
    const attemptsInWindow = blockedAttemptTimes.filter((ts) => ts >= windowStart).length

    if (attemptsInWindow >= policy.blockedAttempts) {
      if (!chosen || policy.cooldownMinutes > chosen.cooldownMinutes) {
        chosen = {
          cooldownMinutes: policy.cooldownMinutes,
          blockedAttempts: attemptsInWindow,
          windowMinutes: policy.windowMinutes,
        }
      }
    }
  }

  return chosen
}

export function getActiveCooldown(expiresAt: Date, now: Date = new Date()): ActiveFraudCooldown | null {
  if (expiresAt <= now) return null

  const retryAfterSeconds = Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000))
  return { expiresAt, retryAfterSeconds }
}
