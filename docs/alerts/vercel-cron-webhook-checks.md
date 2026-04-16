# Vercel Cron + Webhook Checks

## Purpose
This guide wires automated health checks for settlement and risk signals using Vercel cron and an internal heartbeat endpoint.

## 1. Required Environment Variables
Set these in production.

- MONITORING_SECRET: shared secret for heartbeat authorization
- CRON_SECRET: Vercel cron bearer token (recommended for scheduled calls)
- OUTBOX_PROCESSING_LEASE_SECONDS: lock lease in seconds
- ALERT_WEBHOOK_URL: optional webhook receiver for WARN and CRITICAL events

Optional.

- ALERT_WEBHOOK_TOKEN: bearer token used when sending webhook notifications
- ALERT_SLACK_WEBHOOK_URL: Slack incoming webhook URL used by internal relay

## 1.1 Recommended Built-In Relay Setup

Use the internal relay route as the monitoring webhook receiver.

- ALERT_WEBHOOK_URL=https://stake-pesa.vercel.app/api/internal/alerts/relay
- ALERT_WEBHOOK_TOKEN=<strong random token>
- ALERT_SLACK_WEBHOOK_URL=<your Slack incoming webhook URL>

The monitoring heartbeat sends alerts to ALERT_WEBHOOK_URL with bearer auth.
The relay validates ALERT_WEBHOOK_TOKEN and forwards formatted messages to Slack.

## 2. Heartbeat Endpoint
Route:

- GET /api/internal/monitoring/heartbeat

Auth:

- x-monitoring-secret: MONITORING_SECRET
- or Authorization: Bearer MONITORING_SECRET
- or Authorization: Bearer CRON_SECRET

Response fields include:

- status: ok, warn, or critical
- outbox health snapshot
- risk and fraud summary snapshot
- alerts array with threshold breaches

## 3. Vercel Cron Configuration
This repository includes a cron entry in vercel.json:

- path: /api/internal/monitoring/heartbeat
- schedule: every 5 minutes

Important:

- Configure CRON_SECRET in Vercel so scheduled requests are authorized.

If you need more aggressive checks, change to:

- */1 * * * *

## 4. Webhook Payload
When ALERT_WEBHOOK_URL is set and status is warn or critical, the endpoint sends:

```json
{
  "source": "weka-pesa-monitoring",
  "status": "critical",
  "generatedAt": "2026-04-16T12:00:00.000Z",
  "alerts": [
    "OUTBOX_STALE_PROCESSING",
    "OUTBOX_OLDEST_PENDING_AGE_HIGH"
  ],
  "outbox": {
    "pendingCount": 240,
    "staleProcessingCount": 2
  },
  "risk": {
    "criticalMarkets": 1,
    "fraudBlocked24h": 76
  }
}
```

## 5. Baseline Thresholds
Current checks inside heartbeat:

- CRITICAL: staleProcessingCount > 0
- WARN: pendingCount > 200
- CRITICAL: oldestPendingAgeSeconds > 300
- WARN: oldestProcessingAgeSeconds > OUTBOX_PROCESSING_LEASE_SECONDS
- WARN: criticalMarkets > 0
- WARN: fraudBlocked24h > 100

Tune thresholds to your event baseline after one week of production telemetry.

## 6. Manual Validation
Run this after deploy.

1. Call heartbeat with MONITORING_SECRET.
2. Verify HTTP 200 and status field.
3. Confirm alerts array is empty under normal load.
4. If webhook enabled, verify delivery and signature handling on receiver.
