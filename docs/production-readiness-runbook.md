# Weka Pesa Production Readiness Runbook

## Purpose
This runbook defines the production baseline for reliability, risk controls, fraud controls, and settlement operations.

## 1. Environment Variables
Set these values in Vercel for all production deployments.

- DATABASE_URL
- DIRECT_URL
- AUTH_SECRET
- AUTH_URL
- NEXTAUTH_URL
- NEXT_PUBLIC_APP_URL
- ADMIN_EMAILS
- OUTBOX_WORKER_SECRET
- OUTBOX_PROCESSING_LEASE_SECONDS
- CRON_SECRET
- MONITORING_SECRET
- ALERT_WEBHOOK_URL
- ALERT_WEBHOOK_TOKEN

Set these integration keys according to your active payment mode.

- RESEND_API_KEY
- MPESA_CONSUMER_KEY
- MPESA_CONSUMER_SECRET
- MPESA_SHORTCODE
- MPESA_PASSKEY
- MPESA_CALLBACK_URL
- MPESA_ENVIRONMENT
- INTASEND_PUBLISHABLE_KEY
- INTASEND_SECRET_KEY
- INTASEND_ENV
- INTASEND_WEBHOOK_CHALLENGE

Recommended values.

- AUTH_URL: https://stake-pesa.vercel.app
- NEXTAUTH_URL: https://stake-pesa.vercel.app
- NEXT_PUBLIC_APP_URL: https://stake-pesa.vercel.app
- OUTBOX_PROCESSING_LEASE_SECONDS: 300

## 2. Core Health Endpoints
Use these endpoints in monitoring checks.

- Admin risk and fraud telemetry:
  - GET /api/admin/markets/risk
- Admin outbox health telemetry:
  - GET /api/admin/system/outbox
- Worker outbox claim and ack endpoint:
  - POST /api/internal/outbox

Notes.

- Admin endpoints require a signed-in admin email listed in ADMIN_EMAILS.
- Internal outbox endpoint requires x-outbox-secret.

## 3. Alert Rules
Configure alerts with these thresholds.

### Settlement Outbox
- Critical if staleProcessingCount is greater than 0 for more than 5 minutes.
- Warning if pendingCount is above 200 for more than 5 minutes.
- Critical if oldestPendingAgeSeconds is above 300.
- Warning if oldestProcessingAgeSeconds is above OUTBOX_PROCESSING_LEASE_SECONDS.

### Risk and Fraud
- Warning if fraudAlerts24h increases more than 30 percent day over day.
- Critical if fraudBlocked24h spikes above normal event baseline.
- Warning if criticalMarkets is greater than 0 for more than 10 minutes.
- Warning if activeCooldownUsers rises above expected concurrent user profile.

## 4. Scheduled Worker Requirements
Ensure a recurring worker job runs continuously.

- Poll action=claim at a steady interval.
- Process each event idempotently.
- Ack each event with action=ack and outcome.
- On failure, ack with outcome=failed and retryDelaySeconds.

Worker safety expectations.

- Never process outbox events without secret auth.
- Never drop unacked events.
- Always include workerId for traceability.

## 5. Incident Runbooks

### A. Stuck Settlement Processing
1. Open admin outbox health endpoint.
2. Confirm staleProcessingCount and staleProcessing details.
3. Verify worker uptime and recent logs.
4. Trigger a claim cycle. Stale locks are reclaimed automatically before claims.
5. Confirm pendingCount and staleProcessingCount trend down.
6. Escalate if stale processing persists after 2 reclaim cycles.

### B. Fraud Surge
1. Open admin risk endpoint and inspect recentFraudEvents.
2. Identify top marketId and repeated userId patterns.
3. Temporarily tighten fraud thresholds if abuse is active.
4. Increase cooldown policy aggressiveness if needed.
5. Review risk and fraud ratios after 30 to 60 minutes.

### C. Settlement Backlog
1. Check pendingCount and oldestPendingAgeSeconds.
2. Increase worker throughput by raising claim limit and parallel workers.
3. Verify database health and query latency.
4. Confirm ack success rate from worker logs.

## 6. Release Checklist
Run this checklist for each production release.

1. Run npm test.
2. Confirm Prisma schema and migrations are up to date.
3. Verify required environment variables are set in production.
4. Confirm AUTH and app URL values point to the production domain.
5. Validate admin outbox health endpoint responds and shows sane counts.
6. Validate admin risk endpoint responds and includes platformSummary.
7. Run one controlled outbox smoke cycle in non-peak hours.

## 6.1 Production Bootstrap Commands
Run these once per environment, in order.

1. Apply schema migrations.
2. Verify admin schema artifacts.
3. Seed baseline sectors.
4. Promote a real admin account.
5. Run production readiness preflight.

```bash
npx prisma migrate deploy
npm run verify:admin-schema
npm run seed:admin-sectors
npm run admin:promote -- <admin-email>
npm run verify:production
```

Notes.

- admin:promote is idempotent and will report if the user is already ADMIN.
- verify:production fails if required env variables are missing, admin schema is incomplete, sectors are not seeded, or no configured ADMIN_EMAILS user has role ADMIN.

## 7. Post-Deployment Verification
Complete within 10 minutes of deploy.

1. Place a small test bet as a valid user.
2. Confirm idempotent retry behavior using the same request ID.
3. Confirm risk and fraud logs are visible in admin risk telemetry.
4. Confirm outbox claim and ack loop is healthy.

## 8. Operational Ownership
Assign clear owners.

- Application owner: release and API health.
- Risk owner: threshold tuning and fraud response.
- Payments owner: callback/webhook integrity.
- On-call owner: outbox processing continuity.
