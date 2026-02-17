-- =============================================
-- Echoflow - User BYOK OpenRouter Keys
-- =============================================
-- Migration: 20260214000000_user_ai_keys.sql
-- Description: Stores encrypted per-user OpenRouter API keys (BYOK)
-- =============================================

CREATE TABLE public.user_ai_keys (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  encrypted_key TEXT NOT NULL,
  key_last4 TEXT NOT NULL CHECK (char_length(key_last4) = 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_ai_keys_updated_at ON public.user_ai_keys(updated_at DESC);

COMMENT ON TABLE public.user_ai_keys IS 'Encrypted user-provided OpenRouter API keys (BYOK)';
COMMENT ON COLUMN public.user_ai_keys.encrypted_key IS 'AES-GCM encrypted OpenRouter key';
COMMENT ON COLUMN public.user_ai_keys.key_last4 IS 'Last 4 characters for display only';

ALTER TABLE public.user_ai_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI key"
ON public.user_ai_keys
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI key"
ON public.user_ai_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI key"
ON public.user_ai_keys
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI key"
ON public.user_ai_keys
FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER on_user_ai_key_updated
BEFORE UPDATE ON public.user_ai_keys
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();
