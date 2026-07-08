---
name: Mint wallet binding
description: Wallet identity check added to both processClaimMint and processPreflight to prevent replay attacks.
---

# Mint Wallet Ownership Binding

## The rule
Both `processPreflight` and `processClaimMint` in `src/lib/mint.logic.ts` query `profiles.wallet_address` for the authenticated user. If a wallet address is registered in the profile, the `walletAddress` parameter provided by the client MUST match it.

**Why:** Without this check, an attacker who intercepts another user's valid on-chain tx signature can call claimMint with that signature + the victim's wallet address, causing the NFT to be assigned to the attacker's account (different userId, same wallet address in the tx).

**How to apply:**
- Step 3.5 in `processClaimMint`: queries `supabase.from("profiles").select("wallet_address").eq("id", userId).single()` — rejects if mismatch.
- Same check in `processPreflight` step 3.5 — rejects before user is asked to pay.
- Only blocks if profile has a wallet set; first-time minters (no wallet in profile) pass through.

**Test coverage:** The mock DB returns `{ data: null, error: null }` for unknown tables, so existing tests are not affected by this check (profile = null → skip check).
