-- ═══════════════════════════════════════════════════════════════
-- AFRICAN X1 — NFT Staking System
-- Additive module: does NOT touch nfts / transactions / collection_config
-- or any mint/marketplace tables. Safe to run once, idempotent-ish via
-- IF NOT EXISTS / ON CONFLICT guards.
-- ═══════════════════════════════════════════════════════════════

-- Reward token a staker can choose for a session. XNT is app-level
-- restricted to Legendary-rarity NFTs (enforced in server logic).
DO $$ BEGIN
  CREATE TYPE public.reward_token AS ENUM ('x1brains', 'africa', 'xnt');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stake_status AS ENUM ('active', 'claimed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Per-token daily reward rate. Kept in a table (not hardcoded) so an
-- admin can tune the economy later without a redeploy.
CREATE TABLE IF NOT EXISTS public.staking_config (
  reward_token public.reward_token PRIMARY KEY,
  display_name TEXT NOT NULL,
  daily_rate NUMERIC(20,6) NOT NULL CHECK (daily_rate >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.staking_config (reward_token, display_name, daily_rate) VALUES
  ('x1brains', 'X1Brains', 10),
  ('africa', 'AFRICA (AF)', 6),
  ('xnt', 'XNT', 0.05)
ON CONFLICT (reward_token) DO NOTHING;

GRANT SELECT ON public.staking_config TO anon, authenticated;
GRANT ALL ON public.staking_config TO service_role;
ALTER TABLE public.staking_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staking_config_public_read" ON public.staking_config;
CREATE POLICY "staking_config_public_read" ON public.staking_config
  FOR SELECT TO anon, authenticated USING (true);

-- One staking session per NFT. A new row is created on stake and updated
-- (status -> claimed) on claim; the NFT can be staked again afterwards
-- since the uniqueness constraint below only applies to 'active' rows.
CREATE TABLE IF NOT EXISTS public.staking_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id UUID NOT NULL REFERENCES public.nfts(id) ON DELETE CASCADE,
  owner_wallet TEXT NOT NULL,
  reward_token public.reward_token NOT NULL,
  period_days INT NOT NULL CHECK (period_days IN (30, 60, 90)),
  multiplier NUMERIC(4,2) NOT NULL CHECK (multiplier > 0),
  status public.stake_status NOT NULL DEFAULT 'active',
  staked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlock_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  reward_amount NUMERIC(20,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce "only one active stake per NFT" at the DB level, not just in
-- app code, so a race between two tabs can't double-stake the same NFT.
CREATE UNIQUE INDEX IF NOT EXISTS staking_positions_active_nft_uidx
  ON public.staking_positions (nft_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS staking_positions_wallet_idx ON public.staking_positions (owner_wallet);
CREATE INDEX IF NOT EXISTS staking_positions_status_idx ON public.staking_positions (status);

GRANT SELECT ON public.staking_positions TO anon, authenticated;
GRANT ALL ON public.staking_positions TO service_role;
ALTER TABLE public.staking_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staking_positions_public_read" ON public.staking_positions;
CREATE POLICY "staking_positions_public_read" ON public.staking_positions
  FOR SELECT TO anon, authenticated USING (true);
-- No INSERT/UPDATE/DELETE policy for anon/authenticated — all writes go
-- through the server (supabaseAdmin, service_role), mirroring the mint
-- module's pattern of validating ownership/rules before touching data.
