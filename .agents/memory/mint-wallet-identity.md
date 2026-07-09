---
name: Mint wallet-only identity model
description: Why this project's mint flow is wallet-based with no Supabase sign-in requirement, and how trust is established.
---

## Rule
Minting requires only a connected wallet — no Supabase email/password/Google sign-in.

## Why
Anonymous sign-ins are disabled on the Supabase project (`anonymous_provider_disabled`), so transparent auto-auth was not viable. The on-chain payment verification (`verifyPaymentOnChain`) already independently confirms the transaction sender matches the claimed `walletAddress`, which is a sufficient trust boundary for minting. Adding a Supabase session requirement on top would only block legitimate investors.

## How to apply
- `preflightMint` and `claimMint` server functions: **no `requireSupabaseAuth` middleware**. All DB operations go through the admin/service-role client (`getAdmin`), which bypasses RLS.
- Per-wallet limits: keyed off `nfts.owner_wallet` (not `owner_user_id`). The `owner_user_id` column is left null for wallet-only mints.
- `mint.tsx`: no `useAuth`/`user` import or gating. `canMint` depends only on wallet connection state, config readiness, and sold-out flag.
- `/dashboard` (profile, "My NFTs"): still gated by real Supabase sign-in — wallet-only mints will not appear there, which is a known gap.
- All 16 unit tests pass with this model (no userId/supabase params in processClaimMint/processPreflight).
