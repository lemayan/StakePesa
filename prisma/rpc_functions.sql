-- ================================================================
-- StakePesa Financial RPC Functions
-- Atomic wallet mutations with row-level locking.
-- Execute this via Supabase SQL Editor or prisma db execute.
-- ================================================================

-- ────────────────────────────────────────────
-- ENSURE WALLET EXISTS (idempotent helper)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ensure_wallet(p_user_id TEXT)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  SELECT id INTO v_wallet_id FROM "Wallet" WHERE "userId" = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO "Wallet" (id, "userId", balance, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), p_user_id, 0, NOW(), NOW())
    ON CONFLICT ("userId") DO NOTHING
    RETURNING id INTO v_wallet_id;
    
    -- If the INSERT was a no-op due to race, re-select
    IF v_wallet_id IS NULL THEN
      SELECT id INTO v_wallet_id FROM "Wallet" WHERE "userId" = p_user_id;
    END IF;
  END IF;
  
  RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- CREDIT WALLET
-- Atomically credits a wallet and creates a ledger entry.
-- Uses SELECT ... FOR UPDATE to prevent concurrent mutations.
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id TEXT,
  p_amount INT,
  p_transaction_id UUID DEFAULT NULL,
  p_entry_type TEXT DEFAULT 'CREDIT',
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(new_balance INT, ledger_entry_id UUID) AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance INT;
  v_ledger_id UUID;
BEGIN
  -- Validate
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive. Got: %', p_amount;
  END IF;

  -- Ensure wallet exists
  v_wallet_id := ensure_wallet(p_user_id);

  -- Lock the wallet row
  SELECT w.balance INTO v_new_balance
  FROM "Wallet" w
  WHERE w.id = v_wallet_id
  FOR UPDATE;

  v_new_balance := v_new_balance + p_amount;

  -- Update wallet balance
  UPDATE "Wallet"
  SET balance = v_new_balance, "updatedAt" = NOW()
  WHERE id = v_wallet_id;

  -- Create ledger entry
  v_ledger_id := gen_random_uuid();
  INSERT INTO "LedgerEntry" (
    id, "userId", "walletId", "transactionId", "entryType",
    amount, "balanceAfter", description, "createdAt"
  ) VALUES (
    v_ledger_id, p_user_id, v_wallet_id, p_transaction_id,
    p_entry_type::"LedgerEntryType",
    p_amount, v_new_balance, p_description, NOW()
  );

  RETURN QUERY SELECT v_new_balance, v_ledger_id;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- DEBIT WALLET
-- Atomically debits a wallet with balance guard.
-- Raises exception if insufficient funds.
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id TEXT,
  p_amount INT,
  p_transaction_id UUID DEFAULT NULL,
  p_entry_type TEXT DEFAULT 'DEBIT',
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(new_balance INT, ledger_entry_id UUID) AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance INT;
  v_new_balance INT;
  v_ledger_id UUID;
BEGIN
  -- Validate
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Debit amount must be positive. Got: %', p_amount;
  END IF;

  -- Ensure wallet exists
  v_wallet_id := ensure_wallet(p_user_id);

  -- Lock the wallet row and check balance
  SELECT w.balance INTO v_current_balance
  FROM "Wallet" w
  WHERE w.id = v_wallet_id
  FOR UPDATE;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds. Balance: %, Requested: %', v_current_balance, p_amount;
  END IF;

  v_new_balance := v_current_balance - p_amount;

  -- Update wallet balance
  UPDATE "Wallet"
  SET balance = v_new_balance, "updatedAt" = NOW()
  WHERE id = v_wallet_id;

  -- Create ledger entry
  v_ledger_id := gen_random_uuid();
  INSERT INTO "LedgerEntry" (
    id, "userId", "walletId", "transactionId", "entryType",
    amount, "balanceAfter", description, "createdAt"
  ) VALUES (
    v_ledger_id, p_user_id, v_wallet_id, p_transaction_id,
    p_entry_type::"LedgerEntryType",
    p_amount, v_new_balance, p_description, NOW()
  );

  RETURN QUERY SELECT v_new_balance, v_ledger_id;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- LOCK ESCROW
-- Debits wallet and creates an escrow lock entry.
-- All inside a single atomic operation.
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION lock_escrow(
  p_user_id TEXT,
  p_challenge_id UUID,
  p_amount INT,
  p_transaction_id UUID DEFAULT NULL
)
RETURNS TABLE(new_balance INT, escrow_lock_id UUID) AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance INT;
  v_new_balance INT;
  v_escrow_id UUID;
  v_ledger_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Escrow amount must be positive. Got: %', p_amount;
  END IF;

  v_wallet_id := ensure_wallet(p_user_id);

  -- Lock wallet row
  SELECT w.balance INTO v_current_balance
  FROM "Wallet" w
  WHERE w.id = v_wallet_id
  FOR UPDATE;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds for escrow. Balance: %, Requested: %', v_current_balance, p_amount;
  END IF;

  v_new_balance := v_current_balance - p_amount;

  -- Debit wallet
  UPDATE "Wallet"
  SET balance = v_new_balance, "updatedAt" = NOW()
  WHERE id = v_wallet_id;

  -- Create escrow lock
  v_escrow_id := gen_random_uuid();
  INSERT INTO "EscrowLock" (id, "challengeId", "userId", amount, status, "createdAt")
  VALUES (v_escrow_id, p_challenge_id, p_user_id, p_amount, 'LOCKED', NOW());

  -- Ledger entry
  v_ledger_id := gen_random_uuid();
  INSERT INTO "LedgerEntry" (
    id, "userId", "walletId", "transactionId", "entryType",
    amount, "balanceAfter", description, "createdAt"
  ) VALUES (
    v_ledger_id, p_user_id, v_wallet_id, p_transaction_id,
    'ESCROW_LOCK'::"LedgerEntryType",
    p_amount, v_new_balance,
    'Escrow lock for challenge ' || p_challenge_id::TEXT,
    NOW()
  );

  RETURN QUERY SELECT v_new_balance, v_escrow_id;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- RELEASE ESCROW
-- Releases escrowed funds to a winner, deducts platform fee.
-- p_fee_bps = fee in basis points (300 = 3%)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION release_escrow(
  p_escrow_lock_id UUID,
  p_winner_id TEXT,
  p_fee_bps INT DEFAULT 300  -- 3% default
)
RETURNS TABLE(winner_credited INT, fee_deducted INT) AS $$
DECLARE
  v_escrow RECORD;
  v_fee INT;
  v_payout INT;
  v_wallet_id UUID;
  v_new_balance INT;
BEGIN
  -- Lock the escrow row
  SELECT * INTO v_escrow
  FROM "EscrowLock"
  WHERE id = p_escrow_lock_id AND status = 'LOCKED'
  FOR UPDATE;

  IF v_escrow IS NULL THEN
    RAISE EXCEPTION 'Escrow lock not found or already released: %', p_escrow_lock_id;
  END IF;

  -- Calculate fee and payout
  v_fee := (v_escrow.amount * p_fee_bps) / 10000;
  v_payout := v_escrow.amount - v_fee;

  -- Mark escrow as released
  UPDATE "EscrowLock" SET status = 'RELEASED' WHERE id = p_escrow_lock_id;

  -- Credit winner's wallet
  v_wallet_id := ensure_wallet(p_winner_id);

  SELECT w.balance INTO v_new_balance
  FROM "Wallet" w
  WHERE w.id = v_wallet_id
  FOR UPDATE;

  v_new_balance := v_new_balance + v_payout;

  UPDATE "Wallet"
  SET balance = v_new_balance, "updatedAt" = NOW()
  WHERE id = v_wallet_id;

  -- Ledger: ESCROW_RELEASE for the payout
  INSERT INTO "LedgerEntry" (
    id, "userId", "walletId", "transactionId", "entryType",
    amount, "balanceAfter", description, "createdAt"
  ) VALUES (
    gen_random_uuid(), p_winner_id, v_wallet_id, NULL,
    'ESCROW_RELEASE'::"LedgerEntryType",
    v_payout, v_new_balance,
    'Escrow release from lock ' || p_escrow_lock_id::TEXT,
    NOW()
  );

  -- Ledger: FEE entry (recorded against original escrower, not winner)
  IF v_fee > 0 THEN
    INSERT INTO "LedgerEntry" (
      id, "userId", "walletId", "transactionId", "entryType",
      amount, "balanceAfter", description, "createdAt"
    ) VALUES (
      gen_random_uuid(), v_escrow."userId",
      (SELECT id FROM "Wallet" WHERE "userId" = v_escrow."userId"),
      NULL,
      'FEE'::"LedgerEntryType",
      v_fee,
      (SELECT balance FROM "Wallet" WHERE "userId" = v_escrow."userId"),
      'Platform fee (' || (p_fee_bps::FLOAT / 100)::TEXT || '%) on escrow ' || p_escrow_lock_id::TEXT,
      NOW()
    );
  END IF;

  RETURN QUERY SELECT v_payout, v_fee;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- REFUND ESCROW
-- Returns escrowed funds to the original depositor.
-- Used for cancelled challenges.
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refund_escrow(p_escrow_lock_id UUID)
RETURNS INT AS $$
DECLARE
  v_escrow RECORD;
  v_wallet_id UUID;
  v_new_balance INT;
BEGIN
  SELECT * INTO v_escrow
  FROM "EscrowLock"
  WHERE id = p_escrow_lock_id AND status = 'LOCKED'
  FOR UPDATE;

  IF v_escrow IS NULL THEN
    RAISE EXCEPTION 'Escrow lock not found or not in LOCKED state: %', p_escrow_lock_id;
  END IF;

  UPDATE "EscrowLock" SET status = 'REFUNDED' WHERE id = p_escrow_lock_id;

  v_wallet_id := ensure_wallet(v_escrow."userId");

  SELECT w.balance INTO v_new_balance
  FROM "Wallet" w WHERE w.id = v_wallet_id FOR UPDATE;

  v_new_balance := v_new_balance + v_escrow.amount;

  UPDATE "Wallet"
  SET balance = v_new_balance, "updatedAt" = NOW()
  WHERE id = v_wallet_id;

  INSERT INTO "LedgerEntry" (
    id, "userId", "walletId", "transactionId", "entryType",
    amount, "balanceAfter", description, "createdAt"
  ) VALUES (
    gen_random_uuid(), v_escrow."userId", v_wallet_id, NULL,
    'CREDIT'::"LedgerEntryType",
    v_escrow.amount, v_new_balance,
    'Escrow refund for lock ' || p_escrow_lock_id::TEXT,
    NOW()
  );

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;
