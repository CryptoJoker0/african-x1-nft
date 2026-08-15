-- Add a configurable staking gas fee to collection_config.
-- Default: 5.69 XNT ≈ $3.00 at XNT = $0.527.
-- Update via the admin panel or SQL when the XNT price changes.
ALTER TABLE public.collection_config
  ADD COLUMN IF NOT EXISTS staking_gas_fee_xnt NUMERIC NOT NULL DEFAULT 5.69;

-- Track the gas-fee payment signature on each stake position.
-- The UNIQUE index prevents replay attacks (same payment used to stake twice).
ALTER TABLE public.staking_positions
  ADD COLUMN IF NOT EXISTS gas_fee_signature TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS staking_gas_fee_sig_unique
  ON public.staking_positions (gas_fee_signature)
  WHERE gas_fee_signature IS NOT NULL;
