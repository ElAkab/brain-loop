-- Migration: Système Study Credits
-- Date: 2026-02-17
-- Description: Ajoute la table user_credits pour le système de paiement par crédits

-- Table des crédits utilisateurs
CREATE TABLE IF NOT EXISTS public.user_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    balance INTEGER DEFAULT 0 NOT NULL, -- Nombre de questions restantes
    total_purchased INTEGER DEFAULT 0 NOT NULL, -- Statistique totale
    total_consumed INTEGER DEFAULT 0 NOT NULL, -- Statistique totale
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_user_credits_user_id ON public.user_credits(user_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON public.user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour consommer un crédit (atomique)
CREATE OR REPLACE FUNCTION public.consume_credit(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    new_balance INTEGER,
    message TEXT
) AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    -- Vérifier le solde actuel avec verrou
    SELECT balance INTO v_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Si pas de ligne, créer avec balance 0
    IF v_balance IS NULL THEN
        INSERT INTO public.user_credits (user_id, balance)
        VALUES (p_user_id, 0);
        v_balance := 0;
    END IF;
    
    -- Vérifier s'il y a assez de crédits
    IF v_balance <= 0 THEN
        RETURN QUERY SELECT FALSE, 0, 'Insufficient credits'::TEXT;
        RETURN;
    END IF;
    
    -- Décrémenter le solde
    UPDATE public.user_credits
    SET 
        balance = balance - 1,
        total_consumed = total_consumed + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Loguer l'audit
    INSERT INTO public.audit_logs (user_id, action, resource_type, metadata)
    VALUES (p_user_id, 'CREDITS_CONSUMED', 'USER_CREDITS', jsonb_build_object(
        'amount', 1,
        'new_balance', v_balance - 1
    ));
    
    RETURN QUERY SELECT TRUE, v_balance - 1, 'Credit consumed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour ajouter des crédits (appelée par webhook Stripe)
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id UUID, p_amount INTEGER, p_metadata JSONB DEFAULT '{}')
RETURNS TABLE (
    success BOOLEAN,
    new_balance INTEGER,
    message TEXT
) AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    -- Upsert: créer si n'existe pas, sinon mettre à jour
    INSERT INTO public.user_credits (user_id, balance, total_purchased)
    VALUES (p_user_id, p_amount, p_amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET
        balance = user_credits.balance + p_amount,
        total_purchased = user_credits.total_purchased + p_amount,
        updated_at = NOW()
    RETURNING user_credits.balance INTO v_balance;
    
    -- Loguer l'audit
    INSERT INTO public.audit_logs (user_id, action, resource_type, metadata)
    VALUES (p_user_id, 'CREDITS_PURCHASED', 'USER_CREDITS', jsonb_build_object(
        'amount', p_amount,
        'new_balance', v_balance,
        'stripe_data', p_metadata
    ));
    
    RETURN QUERY SELECT TRUE, v_balance, 'Credits added successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir le solde
CREATE OR REPLACE FUNCTION public.get_credit_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.user_credits
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Users can only view their own credits
CREATE POLICY "Users can view own credits" ON public.user_credits
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only update their own credits (via functions)
CREATE POLICY "Users can update own credits" ON public.user_credits
    FOR UPDATE USING (auth.uid() = user_id);

-- Insert policy
CREATE POLICY "Users can insert own credits" ON public.user_credits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Commentaires
COMMENT ON TABLE public.user_credits IS 'Table des crédits Study Questions par utilisateur';
COMMENT ON COLUMN public.user_credits.balance IS 'Nombre de questions restantes';
COMMENT ON COLUMN public.user_credits.total_purchased IS 'Total des crédits achetés (stats)';
COMMENT ON COLUMN public.user_credits.total_consumed IS 'Total des crédits consommés (stats)';
