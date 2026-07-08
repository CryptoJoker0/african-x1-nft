-- Genesis Collection seed: 50 NFTs + correct config
-- Apply via: Supabase Dashboard → SQL Editor, or supabase db push

-- 1. Fix collection_config: 50 supply, correct treasury, live settings
UPDATE public.collection_config SET
  max_supply      = 50,
  mint_price      = 30,
  max_per_wallet  = 2,
  mint_paused     = false,
  whitelist_only  = false,
  treasury_wallet = '9rMJNa5QiNakB45qyymGBNVcALrcHYvwnm15mQcZJfNK',
  rpc_url         = 'https://rpc.mainnet.x1.xyz'
WHERE id = 1;

-- 2. Seed 50 available NFTs (only if none exist yet)
DO $$
DECLARE
  i INT;
  rarity_val public.nft_rarity;
BEGIN
  IF (SELECT COUNT(*) FROM public.nfts) = 0 THEN
    FOR i IN 1..50 LOOP
      -- Assign rarities: 1 legendary, 4 elite, 10 rare, 15 uncommon, 20 common
      IF    i = 1            THEN rarity_val := 'legendary';
      ELSIF i BETWEEN 2  AND 5  THEN rarity_val := 'elite';
      ELSIF i BETWEEN 6  AND 15 THEN rarity_val := 'rare';
      ELSIF i BETWEEN 16 AND 30 THEN rarity_val := 'uncommon';
      ELSE                       rarity_val := 'common';
      END IF;

      INSERT INTO public.nfts (token_id, name, rarity, status)
      VALUES (
        i,
        'AFRICAN X1 #' || LPAD(i::TEXT, 3, '0'),
        rarity_val,
        'available'
      );
    END LOOP;
  END IF;
END $$;
