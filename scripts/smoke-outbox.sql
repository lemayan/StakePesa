INSERT INTO "SettlementOutbox" (
  "eventKey",
  "eventType",
  "aggregateType",
  "aggregateId",
  payload,
  status,
  attempts,
  "availableAt",
  "createdAt",
  "updatedAt"
)
VALUES (
  'manual-smoke-' || gen_random_uuid()::text,
  'SMOKE_TEST',
  'MARKET',
  'smoke-market',
  '{"note":"smoke"}'::jsonb,
  'PENDING',
  0,
  NOW(),
  NOW(),
  NOW()
);
