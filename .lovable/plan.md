
## Scope
Preserve the existing AFRICAN X1 UI. Extend the current Lovable Cloud (Supabase + TanStack server functions) backend so the platform becomes production-ready with a private admin dashboard, secure AI provider configuration, NFT/collection management with artwork upload, a modular fixed-price marketplace, and audit logging.

Nothing about the visual design, palette, typography, layout, or existing pages (Home, Auth, Mint, Collection, Dashboard) will change other than adding new admin sub-tabs and small "Buy / List" surfaces on collection cards.

## 1. Database migration (single migration)
New enums, tables and columns — all in `public`, with GRANTs, RLS and policies:

- Extend `collection_config`: `royalty_bps` (int, default 500), `platform_fee_bps` (int, default 250), `fee_wallet` (text), `featured_nft_ids` (uuid[]).
- Extend `nfts`: `metadata_uri` (text), `list_price` (numeric), `listed_at` (timestamptz), `is_featured` (bool), `creator_user_id` (uuid).
- New enum `listing_status`: `active | sold | cancelled`.
- New table `listings`: `nft_id`, `seller_user_id`, `seller_wallet`, `price`, `status`, timestamps. Public SELECT of `active` listings; sellers manage their own; admins manage all.
- New enum `sale_status`: `pending | confirmed | failed`.
- New table `sales`: `nft_id`, `listing_id`, `buyer_user_id`, `buyer_wallet`, `seller_wallet`, `price`, `royalty_amount`, `platform_fee_amount`, `seller_amount`, `signature`, `status`, timestamps. Buyers/sellers see their own; admins see all.
- New table `audit_logs`: `actor_user_id`, `action`, `entity_type`, `entity_id`, `metadata jsonb`, `ip`, `created_at`. Admins read; inserts only via SECURITY DEFINER function.
- New table `platform_settings`: single-row key/value store for non-secret runtime toggles (e.g. `ai_provider = 'lovable' | 'openai' | 'anthropic'`, `marketplace_enabled`). Admins read/write; public read for the provider flag only via a SECURITY DEFINER function.
- Storage bucket `nft-artwork` (public read, admin-only write) for artwork/metadata uploads.
- SECURITY DEFINER `log_admin_action(action text, entity_type text, entity_id text, metadata jsonb)` for consistent audit inserts.

## 2. Server functions (TanStack `createServerFn`)
All under `src/lib/*.functions.ts` (client-safe path). Every admin function uses `.middleware([requireSupabaseAuth])` + explicit `has_role(userId, 'admin')` check and writes to `audit_logs`.

- `admin.functions.ts` — `listUsers`, `grantRole`, `revokeRole`, `listAuditLogs`.
- `nft.functions.ts` — `createNft`, `updateNft`, `deleteNft`, `uploadNftArtwork` (signed URL), `setFeatured`.
- `collection.functions.ts` — `updateCollectionConfig` (extends existing config surface).
- `marketplace.functions.ts` — `createListing`, `cancelListing`, `recordSale` (server computes royalty/platform fee splits), `listActiveListings` (public, publishable-key client), `listMySales`.
- `ai-settings.functions.ts` — `getAiSettings` (redacted: booleans "openai key present" etc.), `setAiSettings` (updates `platform_settings.ai_provider`; secret keys stored via Lovable secrets, not the DB), `testAiConnection` (server calls Lovable AI Gateway / OpenAI / Anthropic based on selected provider and returns pass/fail).
- `chat.functions.ts` (thin) — `runAiCompletion({prompt})` routes to selected provider using server-only secrets. Frontend never sees keys.

## 3. AI provider secrets
- Default: existing `LOVABLE_API_KEY` (Lovable AI Gateway — no user key needed).
- Optional BYO: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`. Added via the secrets tool when the admin submits them from the AI Settings page (server-side only; never sent to browser).
- `platform_settings.ai_provider` selects which is used at runtime.

## 4. Admin dashboard extensions (visual style preserved)
Add four sub-sections to the existing "Editor's desk" sidebar without changing the design system:
- `05 NFTs` — create/edit/delete NFTs, upload artwork, set rarity, set royalty bps, feature toggle.
- `06 Marketplace` — enable/disable marketplace, view listings, cancel any listing, set platform fee %, choose featured NFTs.
- `07 AI Settings` — provider toggle (Lovable / OpenAI / Anthropic), buttons "Add OpenAI Key", "Add Anthropic Key" (opens secret prompt), "Test connection", status pill. Never shows key values.
- `08 Audit Log` — paginated log of admin actions.

Existing 01–04 (Overview, Controls, Config, Whitelist) stay.

## 5. Public / user surfaces (minimal additions only)
- Collection page: if `list_price` set and `marketplace_enabled`, show "Buy" button that calls `recordSale` after wallet payment.
- Dashboard: "List for sale" / "Cancel listing" actions on owned NFTs. Both are small controls layered onto existing cards; no layout change.

## 6. Security
- RLS on every new table with least-privilege policies (owner-scoped for listings/sales, admin-only for audit/settings).
- All admin writes go through server functions that verify `has_role(userId, 'admin')` and log to `audit_logs`.
- Zod validation on every server-fn input.
- Service-role client (`supabaseAdmin`) loaded inside handler bodies via `await import()`, only for role grants, storage admin ops, and audit inserts.
- AI keys never in the client bundle; provider selection stored in DB, secrets in Lovable secrets.
- Storage bucket `nft-artwork`: public read, insert/update/delete only by admins.

## 7. Deliverables
- 1 migration
- New server function modules (`admin`, `nft`, `collection`, `marketplace`, `ai-settings`, `chat`)
- Admin dashboard extended with 4 new sub-sections (same visual language)
- Minimal Buy / List controls on existing collection & dashboard cards
- Marketplace and audit logs queryable, listings + sales working end-to-end
- No changes to Home, Auth, Mint, Header, Footer, Background, or design tokens

## What is deliberately deferred
- On-chain auctions (schema is modular so this can be added later without migration churn)
- Advanced analytics dashboards beyond existing KPIs
- Per-network smart-contract switcher UI (config table already supports it; no UI beyond current fields)

## Technical notes
- Everything on Lovable Cloud stack — no separate Node service, no Netlify/Render split.
- Frontend imports server functions via `useServerFn`; bearer already attached by existing `attachSupabaseAuth` middleware in `src/start.ts`.
- Public listing reads use a publishable-key server client + narrow `TO anon` SELECT policy on `active` listings only.
- All new admin routes remain under `/admin` (already gated by `has_role`).
