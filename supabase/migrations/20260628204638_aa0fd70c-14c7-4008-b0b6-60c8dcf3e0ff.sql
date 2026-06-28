
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  wallet_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Collection config (singleton)
CREATE TABLE public.collection_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  collection_name TEXT NOT NULL DEFAULT 'AFRICAN X1 NFT',
  symbol TEXT NOT NULL DEFAULT 'AFRX1',
  max_supply INT NOT NULL DEFAULT 5000,
  mint_price NUMERIC(20,9) NOT NULL DEFAULT 0.5,
  max_per_wallet INT NOT NULL DEFAULT 5,
  mint_paused BOOLEAN NOT NULL DEFAULT TRUE,
  whitelist_only BOOLEAN NOT NULL DEFAULT TRUE,
  revealed BOOLEAN NOT NULL DEFAULT FALSE,
  treasury_wallet TEXT,
  program_id TEXT,
  rpc_url TEXT NOT NULL DEFAULT 'https://rpc.x1.xyz',
  pre_reveal_image_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collection_config TO anon, authenticated;
GRANT ALL ON public.collection_config TO service_role;
ALTER TABLE public.collection_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_public_read" ON public.collection_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "config_admin_update" ON public.collection_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.collection_config (id) VALUES (1);

-- NFTs
CREATE TYPE public.nft_rarity AS ENUM ('legendary','elite','rare','uncommon','common');
CREATE TYPE public.nft_status AS ENUM ('available','reserved','minted');

CREATE TABLE public.nfts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id INT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  animation_url TEXT,
  external_url TEXT,
  rarity nft_rarity NOT NULL DEFAULT 'common',
  traits JSONB NOT NULL DEFAULT '{}'::jsonb,
  status nft_status NOT NULL DEFAULT 'available',
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_wallet TEXT,
  mint_signature TEXT,
  minted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX nfts_status_idx ON public.nfts(status);
CREATE INDEX nfts_rarity_idx ON public.nfts(rarity);
CREATE INDEX nfts_owner_idx ON public.nfts(owner_user_id);
GRANT SELECT ON public.nfts TO anon, authenticated;
GRANT ALL ON public.nfts TO service_role;
ALTER TABLE public.nfts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfts_public_read" ON public.nfts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "nfts_admin_all" ON public.nfts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Transactions
CREATE TYPE public.tx_type AS ENUM ('mint','transfer','reveal');
CREATE TYPE public.tx_status AS ENUM ('pending','confirmed','failed');

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nft_id UUID REFERENCES public.nfts(id) ON DELETE SET NULL,
  wallet_address TEXT NOT NULL,
  tx_type tx_type NOT NULL,
  status tx_status NOT NULL DEFAULT 'pending',
  signature TEXT UNIQUE,
  amount NUMERIC(20,9),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);
CREATE INDEX tx_user_idx ON public.transactions(user_id);
CREATE INDEX tx_status_idx ON public.transactions(status);
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_select_own" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tx_insert_own" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tx_admin_update" ON public.transactions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Whitelist
CREATE TABLE public.whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  added_by UUID REFERENCES auth.users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whitelist TO anon, authenticated;
GRANT ALL ON public.whitelist TO service_role;
ALTER TABLE public.whitelist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wl_public_read" ON public.whitelist FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "wl_admin_all" ON public.whitelist FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_config_updated BEFORE UPDATE ON public.collection_config FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
