-- Migration: Top-up Simplification
-- Date: 2026-02-20
-- Description: Consolidate user_credits into profiles, simplify to top-up only billing model.
--   - Removes subscription columns (stripe_subscription_id, subscription_status, monthly_*)
--   - Moves credits + free quota tracking into profiles
--   - Rewrites consume_credit() and add_credits() to target profiles table
--   - Adds processed_stripe_events table for proper webhook idempotency
--   - Drops user_credits table

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Add credit columns to profiles
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS free_used_today INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS free_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Migrate data from user_credits → profiles
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.profiles p
SET
    credits           = COALESCE(uc.premium_balance, 0),
    stripe_customer_id = uc.stripe_customer_id,
    free_used_today   = COALESCE(uc.free_used_today, 0),
    free_reset_at     = COALESCE(uc.free_reset_at, NOW())
FROM public.user_credits uc
WHERE uc.user_id = p.id;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Idempotency table for Stripe webhook events
--   Replaces the in-memory Set<string> which was reset on every cold start.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
    event_id     TEXT PRIMARY KEY,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RLS: only accessible via service role (webhook uses createAdminClient)
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;
-- No user policies → anon/authenticated roles have no access

-- Index for cleanup queries (cron: DELETE WHERE processed_at < NOW() - INTERVAL '30 days')
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_processed_at
    ON public.processed_stripe_events(processed_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 4: Rewrite consume_credit() — now operates on profiles
--   Signature unchanged: (p_user_id UUID, p_is_premium_request BOOLEAN)
--   Return type unchanged: TABLE (success, new_balance, new_free_used, used_premium, message)
--   Thread-safe via SELECT … FOR UPDATE on profiles row.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.consume_credit(
    p_user_id UUID,
    p_is_premium_request BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
    success         BOOLEAN,
    new_balance     INTEGER,
    new_free_used   INTEGER,
    used_premium    BOOLEAN,
    message         TEXT
) AS $$
DECLARE
    v_record    RECORD;
    v_free_limit INTEGER := 20;
BEGIN
    -- Lock profile row for atomic operation
    SELECT credits, free_used_today, free_reset_at
    INTO v_record
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 0, FALSE, 'User not found'::TEXT;
        RETURN;
    END IF;

    -- Reset free counter if new day (handle NULL explicitly to fix existing records)
    IF v_record.free_reset_at IS NULL
       OR v_record.free_reset_at < DATE_TRUNC('day', NOW()) THEN
        v_record.free_used_today := 0;
        v_record.free_reset_at   := NOW();
    END IF;

    -- ── Priority 1: purchased credits (if premium request) ──────────────────
    IF p_is_premium_request AND COALESCE(v_record.credits, 0) > 0 THEN
        UPDATE public.profiles SET
            credits        = credits - 1,
            free_used_today = v_record.free_used_today,
            free_reset_at  = v_record.free_reset_at
        WHERE id = p_user_id;

        -- Audit purchased credit consumption
        INSERT INTO public.audit_logs (user_id, action, resource_type, metadata)
        VALUES (p_user_id, 'CREDITS_CONSUMED', 'PROFILES', jsonb_build_object(
            'type', 'purchased',
            'new_balance', v_record.credits - 1
        ));

        RETURN QUERY SELECT
            TRUE,
            v_record.credits - 1,
            v_record.free_used_today,
            TRUE,
            'Credit consumed (purchased)'::TEXT;
        RETURN;
    END IF;

    -- ── Priority 2: free daily quota ────────────────────────────────────────
    IF v_record.free_used_today < v_free_limit THEN
        UPDATE public.profiles SET
            free_used_today = v_record.free_used_today + 1,
            free_reset_at   = v_record.free_reset_at
        WHERE id = p_user_id;

        RETURN QUERY SELECT
            TRUE,
            COALESCE(v_record.credits, 0),
            v_record.free_used_today + 1,
            FALSE,
            'Free quota used'::TEXT;
        RETURN;
    END IF;

    -- ── No credits available ─────────────────────────────────────────────────
    RETURN QUERY SELECT
        FALSE,
        COALESCE(v_record.credits, 0),
        v_record.free_used_today,
        FALSE,
        'No credits available'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 5: Rewrite add_credits() — now operates on profiles
--   Signature unchanged: (p_user_id UUID, p_amount INTEGER, p_metadata JSONB)
--   Called by Stripe webhook after successful top-up payment.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_credits(
    p_user_id  UUID,
    p_amount   INTEGER,
    p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE (
    success     BOOLEAN,
    new_balance INTEGER,
    message     TEXT
) AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    UPDATE public.profiles
    SET credits = COALESCE(credits, 0) + p_amount
    WHERE id = p_user_id
    RETURNING credits INTO v_balance;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'User not found'::TEXT;
        RETURN;
    END IF;

    -- Audit log
    INSERT INTO public.audit_logs (user_id, action, resource_type, metadata)
    VALUES (p_user_id, 'CREDITS_PURCHASED', 'PROFILES', jsonb_build_object(
        'amount',      p_amount,
        'new_balance', v_balance,
        'stripe_data', p_metadata
    ));

    RETURN QUERY SELECT TRUE, v_balance, 'Credits added successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 6: Drop subscription-related functions (no longer needed)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.update_subscription(UUID, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS public.reset_monthly_credits();
DROP FUNCTION IF EXISTS public.can_use_premium_models(UUID);
-- Note: handle_subscription_payment, initialize_user_credits, reset_monthly_credits_for_user
-- were referenced in the webhook but were never actually created in migrations (P1 from audit).
-- No DROP needed for them.

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 7: Drop user_credits table (data migrated to profiles in Step 2)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.user_credits;

-- ─────────────────────────────────────────────────────────────────────────────
-- Documentation
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.profiles.credits IS
    'Purchased credits (top-up, never expire). Deducted by consume_credit() RPC.';
COMMENT ON COLUMN public.profiles.stripe_customer_id IS
    'Stripe customer ID stored after first top-up payment for future reference.';
COMMENT ON COLUMN public.profiles.free_used_today IS
    'Free tier usage today (resets daily at midnight via consume_credit logic).';
COMMENT ON COLUMN public.profiles.free_reset_at IS
    'Timestamp of last daily reset for free_used_today.';
COMMENT ON TABLE public.processed_stripe_events IS
    'Idempotency tracking for Stripe webhook events. Cleanup: DELETE WHERE processed_at < NOW() - INTERVAL ''30 days''.';
COMMENT ON FUNCTION public.consume_credit(UUID, BOOLEAN) IS
    'Atomically consumes a credit. Tries purchased credits first (if p_is_premium_request=true), then free daily quota. Thread-safe via FOR UPDATE.';
COMMENT ON FUNCTION public.add_credits(UUID, INTEGER, JSONB) IS
    'Atomically adds purchased credits to user profile. Called exclusively by Stripe webhook after verified payment.';
