# Weka Pesa

Weka Pesa is a prediction and challenge platform with a hardened financial core:

- Pari-mutuel market betting with live odds
- Risk controls for liability and concentration
- Fraud scoring with cooldown enforcement
- Durable settlement outbox and idempotent admin settlement

## Local Development

1. Install dependencies.

```bash
npm install
```

2. Run the app.

```bash
npm run dev
```

3. Run tests.

```bash
npm test
```

## Production Operations

Use the runbook for deployment and incident procedures:

- docs/production-readiness-runbook.md

The runbook includes:

- Required environment variables
- Alert thresholds for risk, fraud, and settlement outbox
- Worker health checks and reclaim behavior
- Incident response steps for stuck settlement and fraud spikes
- Release and post-deploy verification checklists
