
ALTER TABLE public.collection_config
  ADD COLUMN IF NOT EXISTS royalty_bps int NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS platform_fee_bps int NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS fee_wallet text,
  ADD COLUMN IF NOT EXISTS marketplace_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.nfts
  ADD COLUMN IF NOT EXISTS metadata_uri text,
  ADD COLUMN IF NOT EXISTS list_price numeric,
  ADD COLUMN IF NOT EXISTS listed_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creator_user_id uuid;

DO $$ BEGIN
  CREATE TYPE public.listing_status AS ENUM ('active','sold','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sale_status AS ENUM ('pending','confirmed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id uuid NOT NULL REFERENCES public.nfts(id) ON DELETE CASCADE,
  seller_user_id uuid NOT NULL,
  seller_wallet text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  status public.listing_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active listings" ON public.listings
  FOR SELECT USING (status = 'active');
CREATE POLICY "Sellers view own listings" ON public.listings
  FOR SELECT TO authenticated USING (auth.uid() = seller_user_id);
CREATE POLICY "Admins view all listings" ON public.listings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sellers insert own listings" ON public.listings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_user_id);
CREATE POLICY "Sellers update own listings" ON public.listings
  FOR UPDATE TO authenticated USING (auth.uid() = seller_user_id);
CREATE POLICY "Admins manage all listings" ON public.listings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id uuid NOT NULL REFERENCES public.nfts(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  buyer_user_id uuid,
  buyer_wallet text NOT NULL,
  seller_wallet text NOT NULL,
  price numeric NOT NULL,
  royalty_amount numeric NOT NULL DEFAULT 0,
  platform_fee_amount numeric NOT NULL DEFAULT 0,
  seller_amount numeric NOT NULL DEFAULT 0,
  signature text,
  status public.sale_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);
GRANT SELECT, INSERT ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sales" ON public.sales
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_user_id OR EXISTS (
    SELECT 1 FROM public.nfts n WHERE n.id = sales.nft_id AND n.owner_user_id = auth.uid()
  ));
CREATE POLICY "Admins view all sales" ON public.sales
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Buyers insert own sales" ON public.sales
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_user_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text, _entity_type text, _entity_id text, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ai_provider text NOT NULL DEFAULT 'lovable',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read platform settings" ON public.platform_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update platform settings" ON public.platform_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert platform settings" ON public.platform_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_settings (id, ai_provider) VALUES (1, 'lovable')
  ON CONFLICT (id) DO NOTHING;
