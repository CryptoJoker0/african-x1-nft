# AFRICAN X1 NFT — Replit Project

## Overview

A full-stack NFT minting platform for the Genesis Collection — 50 unique NFTs minted natively on the X1 Blockchain (a Solana fork). Magazine-editorial aesthetic celebrating African culture.

**Tech Stack:**
- TanStack Start (React 19 + SSR) with TanStack Router
- Supabase (PostgreSQL + Auth)
- Vite 8 / Node.js 22
- Tailwind CSS v4, shadcn/ui, Framer Motion
- @solana/web3.js (browser-only via SSR stub)

## Running the Project

```bash
npm install
npm run dev      # dev server on :5000
npm run build    # production build → .output/
```

Requires Node.js 22+ (node v22 module installed).

## Routes

| Route          | Description                        | Auth Required |
|----------------|------------------------------------|---------------|
| `/`            | Homepage / Magazine hero           | No            |
| `/collection`  | NFT collection page                | No            |
| `/mint`        | Mint NFTs (wallet + sign-in req.)  | Yes + Wallet  |
| `/marketplace` | Secondary market                   | No            |
| `/dashboard`   | Holder dashboard                   | Yes           |
| `/admin`       | Admin panel                        | Admin role    |
| `/auth`        | Sign in / Sign up                  | No            |

## Environment Variables

Already set in `.replit` (userenv/shared):
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — client-side variants

**Secrets required (set in Replit Secrets):**
- `SUPABASE_SERVICE_ROLE_KEY` — **Required for minting.** Bypasses RLS for NFT assignment. Get from Supabase Dashboard → Settings → API.

## Collection Configuration

- **Genesis Collection:** 50 NFTs
- **Treasury wallet:** `9rMJNa5QiNakB45qyymGBNVcALrcHYvwnm15mQcZJfNK`
- **Chain:** X1 Mainnet (`https://rpc.mainnet.x1.xyz`)
- Config lives in `collection_config` table (editable via `/admin`)

## Database Setup

Migrations are in `supabase/migrations/`. Apply in order:
1. `20260628204638_*` — Full schema (profiles, NFTs, transactions, whitelist)
2. `20260628204651_*` / `20260628205340_*` — Function updates
3. `20260629013817_*` — Sets treasury wallet + RPC URL
4. `20260708000000_seed_genesis_collection.sql` — **Seeds 50 NFTs, sets max_supply=50**

To apply migration 4 (if not already done):
→ Supabase Dashboard → SQL Editor → paste `supabase/migrations/20260708000000_seed_genesis_collection.sql`

## Admin Access

The first user to register automatically receives the `admin` role (see `handle_new_user` trigger).
Admin panel at `/admin` — protected by session + role check.

## Mint Flow Security

1. Pre-flight: validates config, whitelist, wallet limits, NFT availability (server-side, before payment)
2. Payment: user signs X1 SOL transfer to treasury wallet on-chain
3. Claim: server verifies payment on X1 RPC, atomically assigns NFT
4. Treasury wallet is hardcoded in `src/lib/mint.logic.ts` (`TREASURY_WALLET`) and validated on every mint

## Asset Notes

- Logo and cover images: Currently using `public/pre-reveal.jpg` as placeholder
  (original assets on Lovable CDN are inaccessible outside Lovable)
- To restore originals: upload via Admin → Upload panel, or replace `public/pre-reveal.jpg`

## User Preferences

- No new features, no redesigns — production-ready fixes only
- Collection size: exactly 50 NFTs
- Architecture: TanStack Start + Supabase (no Anchor, no migrations to different stack)
