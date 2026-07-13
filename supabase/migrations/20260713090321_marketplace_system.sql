-- ═══════════════════════════════════════════════════════════════════════════
-- Marketplace system: listings, sales, community collections & applications.
--
-- Architecture note: follows the existing wallet-only trust model (see
-- mint.logic.ts). All writes to listings/sales/collections/collection_applications
-- go through the service-role admin client from server functions, which verify
-- wallet ownership and/or on-chain payment before writing. Public RLS policies
-- only grant SELECT so the client can read via the anon key directly.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Marketplace config additions ────────────────────────────────────────────
ALTER TABLE public.collection_config
  ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS platform_fee_bps INT NOT NULL DEFAULT 300, -- 3%
  ADD COLUMN IF NOT EXISTS fee_wallet TEXT,
  ADD COLUMN IF NOT EXISTS listing_application_fee_xnt NUMERIC(20,9) NOT NULL DEFAULT 0.05;

-- ── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE public.listing_status AS ENUM ('active','sold','cancelled','removed');
CREATE TYPE public.sale_status AS ENUM ('pending','confirmed','failed');
CREATE TYPE public.application_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.collection_status AS ENUM ('active','suspended');

-- ── Collections (official + approved community projects) ───────────────────
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  website TEXT,
  x_account TEXT,
  telegram TEXT,
  contract_address TEXT,
  creator_wallet TEXT,
  is_official BOOLEAN NOT NULL DEFAULT FALSE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  status public.collection_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX collections_status_idx ON public.collections(status);
GRANT SELECT ON public.collections TO anon, authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collections_public_read" ON public.collections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "collections_admin_all" ON public.collections FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_collections_updated BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed the official AFRICAN X1 Genesis Collection
INSERT INTO public.collections (slug, project_name, collection_name, description, is_official, verified, status)
VALUES (
  'african-x1-genesis',
  'AFRICAN X1',
  'AFRICAN X1 Genesis Collection',
  'The official Genesis Collection — 50 unique NFTs celebrating African culture, minted natively on the X1 Blockchain.',
  TRUE, TRUE, 'active'
);

-- ── Community collection applications ───────────────────────────────────────
CREATE TABLE public.collection_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  website TEXT,
  x_account TEXT,
  telegram TEXT,
  contract_address TEXT,
  creator_wallet TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  listing_fee_amount NUMERIC(20,9) NOT NULL,
  listing_fee_signature TEXT NOT NULL UNIQUE,
  status public.application_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  collection_id UUID REFERENCES public.collections(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX collection_applications_status_idx ON public.collection_applications(status);
GRANT ALL ON public.collection_applications TO service_role;
ALTER TABLE public.collection_applications ENABLE ROW LEVEL SECURITY;
-- No public SELECT: applications carry contact details and are reviewed by admins only.
-- All inserts happen server-side via the admin client after on-chain fee verification.
CREATE POLICY "applications_admin_all" ON public.collection_applications FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ── Listings ─────────────────────────────────────────────────────────────────
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id UUID NOT NULL REFERENCES public.nfts(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES public.collections(id),
  seller_wallet TEXT NOT NULL,
  price NUMERIC(20,9) NOT NULL CHECK (price > 0),
  category TEXT,
  description TEXT,
  status public.listing_status NOT NULL DEFAULT 'active',
  buyer_wallet TEXT,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX listings_status_idx ON public.listings(status);
CREATE INDEX listings_seller_idx ON public.listings(seller_wallet);
CREATE INDEX listings_nft_idx ON public.listings(nft_id);
GRANT SELECT ON public.listings TO anon, authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listings_public_read" ON public.listings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "listings_admin_all" ON public.listings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- One active listing per NFT
CREATE UNIQUE INDEX listings_one_active_per_nft ON public.listings(nft_id) WHERE status = 'active';

-- ── Sales (purchase ledger / fee accounting) ────────────────────────────────
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id),
  nft_id UUID NOT NULL REFERENCES public.nfts(id),
  seller_wallet TEXT NOT NULL,
  buyer_wallet TEXT NOT NULL,
  price NUMERIC(20,9) NOT NULL,
  platform_fee_amount NUMERIC(20,9) NOT NULL DEFAULT 0,
  seller_amount NUMERIC(20,9) NOT NULL DEFAULT 0,
  signature TEXT UNIQUE,
  status public.sale_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);
CREATE INDEX sales_buyer_idx ON public.sales(buyer_wallet);
CREATE INDEX sales_seller_idx ON public.sales(seller_wallet);
CREATE INDEX sales_status_idx ON public.sales(status);
GRANT SELECT ON public.sales TO anon, authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_public_read" ON public.sales FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "sales_admin_all" ON public.sales FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
