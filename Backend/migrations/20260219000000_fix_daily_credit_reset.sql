-- Migration: Fix Daily Credit Reset Bug
-- Date: 2026-02-19
-- Description: Fix NULL comparison issue in consume_credit function that prevented daily reset

-- The issue: In PostgreSQL, NULL < timestamp returns NULL (not TRUE or FALSE)
-- If free_reset_at is NULL (for existing records created before the column was added),
-- the reset condition never triggers.

-- Fix: Update consume_credit function to handle NULL explicitly
CREATE OR REPLACE FUNCTION consume_credit(
    p_user_id UUID,
    p_is_premium_request BOOLEAN DEFAULT false
) RETURNS TABLE (
    success BOOLEAN,
    new_premium_balance INTEGER,
    new_free_used INTEGER,
    used_premium BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_record RECORD;
    v_free_limit INTEGER := 20;
    v_monthly_limit INTEGER := 200;
BEGIN
    -- Lock user record for atomic operation
    SELECT * INTO v_record
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        -- Create record for new user
        INSERT INTO public.user_credits (user_id, premium_balance, subscription_tier, subscription_status, free_reset_at)
        VALUES (p_user_id, 0, 'free', 'inactive', NOW())
        RETURNING * INTO v_record;
    END IF;
    
    -- Reset free counter if new day (handle NULL explicitly)
    -- FIX: Added "IS NULL OR" to handle existing records where free_reset_at might be NULL
    IF v_record.free_reset_at IS NULL OR v_record.free_reset_at < DATE_TRUNC('day', NOW()) THEN
        v_record.free_used_today := 0;
        v_record.free_reset_at := NOW();
    END IF;
    
    -- Try premium if requested and available
    IF p_is_premium_request THEN
        -- Check subscription first
        IF v_record.subscription_status = 'active' 
           AND (v_record.current_period_end IS NULL OR v_record.current_period_end > NOW()) THEN
            -- Pro subscriber with active subscription
            IF v_record.monthly_credits_used < v_monthly_limit THEN
                UPDATE public.user_credits SET
                    monthly_credits_used = monthly_credits_used + 1,
                    total_consumed = total_consumed + 1,
                    free_used_today = v_record.free_used_today,
                    free_reset_at = v_record.free_reset_at,
                    updated_at = NOW()
                WHERE user_id = p_user_id;
                
                RETURN QUERY SELECT TRUE, v_record.premium_balance, v_record.free_used_today, TRUE, 
                    'Premium credit consumed (subscription)'::TEXT;
                RETURN;
            END IF;
        END IF;
        
        -- Check purchased credits
        IF COALESCE(v_record.premium_balance, 0) > 0 THEN
            UPDATE public.user_credits SET
                premium_balance = premium_balance - 1,
                total_consumed = total_consumed + 1,
                free_used_today = v_record.free_used_today,
                free_reset_at = v_record.free_reset_at,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            RETURN QUERY SELECT TRUE, v_record.premium_balance - 1, v_record.free_used_today, TRUE,
                'Premium credit consumed (purchased)'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Fall back to free tier
    IF v_record.free_used_today < v_free_limit THEN
        UPDATE public.user_credits SET
            free_used_today = v_record.free_used_today + 1,
            total_consumed = total_consumed + 1,
            free_reset_at = v_record.free_reset_at,
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        RETURN QUERY SELECT TRUE, v_record.premium_balance, v_record.free_used_today + 1, FALSE,
            'Free quota used'::TEXT;
        RETURN;
    END IF;
    
    -- No credits available
    RETURN QUERY SELECT FALSE, v_record.premium_balance, v_record.free_used_today, FALSE,
        'No credits available'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix existing records with NULL free_reset_at
UPDATE public.user_credits 
SET free_reset_at = NOW() 
WHERE free_reset_at IS NULL;

-- Add a comment documenting the fix
COMMENT ON FUNCTION consume_credit(UUID, BOOLEAN) IS 
'Consumes a credit atomically. Fixed 2026-02-19: Added NULL check for free_reset_at to handle existing records.';
