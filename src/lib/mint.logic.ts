/**
 * mint.logic.ts — pure business logic for the X1 mint flow.
 *
 * No TanStack Start dependencies, no middleware.  Receives clients as
 * parameters so the module is trivially testable with mocks.
 *
 * ══════════════════════════════════════════════════════════
 *  Funds-safety guarantee
 * ══════════════════════════════════════════════════════════
 *
 *  processClaimMint() enforces this sequence:
 *
 *   0. Admin key validated (fails fast if missing — before any payment)
 *   1. Collection config checked (paused? treasury set? rpc set?)
 *   2. Whitelist check (if enabled)
 *   3. Per-wallet mint limit checked
 *   4. PRIMARY IDEMPOTENCY: transactions table checked via admin client
 *   5. SECONDARY IDEMPOTENCY: nfts.mint_signature checked
 *      → handles the case where the ledger write failed on a prior attempt
 *        and the user is retrying with the same on-chain signature
 *   6. CLAIM LOCK: "pending" transaction record inserted atomically.
 *      If the insert fails with a unique-key violation (transactions.signature
 *      has a UNIQUE constraint in the DB), another concurrent request already
 *      owns the lock → return alreadyClaimed without assigning any NFTs.
 *   7. Payment verified on-chain via raw JSON-RPC
 *      → On failure: pending tx deleted (user can retry), error thrown
 *   8. NFTs atomically reserved (UPDATE WHERE status='available')
 *      → On concurrent conflict: partial claim rolled back, error thrown
 *   9. Ledger record updated to "confirmed"
 *  10. Success returned
 *
 *  Buyers can only lose funds if:
 *    – The X1 RPC is unavailable AND the transaction IS confirmed on-chain
 *      (handled: pending tx is deleted → user can retry later)
 *    – NFT assignment fails after payment (extremely rare server-crash case)
 *      (handled: tx marked "failed" so admin can reconcile)
 *
 * ══════════════════════════════════════════════════════════
 *  Requires
 * ══════════════════════════════════════════════════════════
 *   transactions.signature  UNIQUE NOT NULL  (DB-level concurrency guard)
 *   nfts.status             enum('available','reserved','minted')
 *   nfts.mint_signature     nullable text (secondary idempotency key)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * The canonical treasury wallet for the AFRICAN X1 Genesis Collection.
 * Every mint payment MUST be verified against this address on-chain.
 * Any configuration that points to a different wallet is rejected.
 */
export const TREASURY_WALLET = "9rMJNa5QiNakB45qyymGBNVcALrcHYvwnm15mQcZJfNK";

export type DB = SupabaseClient<Database>;

export interface ClaimMintParams {
  signature: string;
  walletAddress: string;
  qty: number;
  /**
   * Returns the admin client (bypasses RLS).
   * Called first — throws if service role key is missing so no payment
   * is ever submitted into a broken system.
   */
  getAdmin: () => Promise<DB>;
}

export interface ClaimMintResult {
  alreadyClaimed: boolean;
  signature: string;
  tokens?: Array<{ id: string; token_id: number; name: string }>;
}

export interface PreflightParams {
  walletAddress: string;
  qty: number;
  getAdmin: () => Promise<DB>;
}

export interface PreflightResult {
  ok: true;
  mintPrice: number;
  treasury: string;
  rpcUrl: string;
  availableCount: number;
}

// ─── Pre-flight ──────────────────────────────────────────────────────────────

/**
 * Server-side pre-flight check — called BEFORE the user submits payment.
 *
 * Validates every server-side condition so buyers are never told to pay into
 * a broken or sold-out collection.
 */
export async function processPreflight(params: PreflightParams): Promise<PreflightResult> {
  const { walletAddress, qty, getAdmin } = params;

  // 0. Validate admin key — fail before anything else
  const admin = await getAdmin();

  // 1. Load config (tests Supabase connectivity)
  const { data: config, error: cfgErr } = await admin
    .from("collection_config")
    .select(
      "mint_price, max_per_wallet, mint_paused, whitelist_only, treasury_wallet, rpc_url, max_supply",
    )
    .eq("id", 1)
    .single();
  if (cfgErr || !config) {
    throw new Error("Collection configuration is unavailable — Supabase connectivity error");
  }
  if (config.mint_paused) throw new Error("Minting is currently paused by the administrator");
  if (!config.treasury_wallet) {
    throw new Error("Administrator configuration error: treasury wallet address is not set");
  }
  // Enforce the canonical treasury wallet — reject any misconfigured address
  if (config.treasury_wallet !== TREASURY_WALLET) {
    throw new Error(
      "Administrator configuration error: treasury wallet does not match the expected address. " +
        `Expected ${TREASURY_WALLET}.`,
    );
  }
  if (!config.rpc_url) {
    throw new Error("Administrator configuration error: X1 RPC URL is not set");
  }

  // 2. Whitelist check
  if (config.whitelist_only) {
    const { data: wl } = await admin
      .from("whitelist")
      .select("id")
      .eq("wallet_address", walletAddress)
      .maybeSingle();
    if (!wl) throw new Error("This wallet address is not on the whitelist");
  }

  // 3. Per-wallet limit — identity is the wallet address itself. No sign-in is
  // required to mint: the on-chain payment signature is independently verified
  // against this exact wallet before any NFT is assigned (see verifyPaymentOnChain),
  // so wallet possession is already the trust boundary.
  const { count: existingCount } = await admin
    .from("nfts")
    .select("*", { count: "exact", head: true })
    .eq("owner_wallet", walletAddress)
    .eq("status", "minted");
  const owned = existingCount ?? 0;
  const maxPerWallet = config.max_per_wallet ?? 5;
  if (owned + qty > maxPerWallet) {
    throw new Error(
      `This wallet already owns ${owned} NFT${owned !== 1 ? "s" : ""}. ` +
        `Minting ${qty} more would exceed the limit of ${maxPerWallet} per wallet.`,
    );
  }

  // 4. NFT availability (admin client bypasses RLS)
  const { count: availableCount, error: availErr } = await admin
    .from("nfts")
    .select("*", { count: "exact", head: true })
    .eq("status", "available");
  if (availErr) throw new Error(`Database error checking availability: ${availErr.message}`);
  const available = availableCount ?? 0;
  if (available < qty) {
    throw new Error(
      available === 0
        ? "The collection is sold out"
        : `Only ${available} NFT${available !== 1 ? "s" : ""} remaining — reduce quantity to ${available}`,
    );
  }

  return {
    ok: true,
    mintPrice: Number(config.mint_price),
    treasury: config.treasury_wallet,
    rpcUrl: config.rpc_url,
    availableCount: available,
  };
}

// ─── Claim ───────────────────────────────────────────────────────────────────

export async function processClaimMint(params: ClaimMintParams): Promise<ClaimMintResult> {
  const { signature, walletAddress, qty, getAdmin } = params;

  // ── Step 0: Validate admin key is configured ─────────────────────────────
  // MUST be first: if the key is missing we must never tell a buyer to proceed.
  const admin = await getAdmin();

  // ── Step 1: Load and validate collection config ──────────────────────────
  const { data: config, error: cfgErr } = await admin
    .from("collection_config")
    .select(
      "mint_price, max_per_wallet, mint_paused, whitelist_only, treasury_wallet, rpc_url, max_supply",
    )
    .eq("id", 1)
    .single();
  if (cfgErr || !config) throw new Error("Collection configuration unavailable");
  if (config.mint_paused) throw new Error("Minting is currently paused");
  if (!config.treasury_wallet)
    throw new Error("Administrator error: treasury wallet not configured");
  // Enforce the canonical treasury wallet — reject any misconfigured address
  if (config.treasury_wallet !== TREASURY_WALLET) {
    throw new Error(
      "Administrator error: treasury wallet does not match the required address. " +
        `Expected ${TREASURY_WALLET}.`,
    );
  }
  if (!config.rpc_url) throw new Error("Administrator error: X1 RPC URL not configured");

  // ── Step 2: Whitelist check ──────────────────────────────────────────────
  if (config.whitelist_only) {
    const { data: wl } = await admin
      .from("whitelist")
      .select("id")
      .eq("wallet_address", walletAddress)
      .maybeSingle();
    if (!wl) throw new Error("This wallet is not on the whitelist");
  }

  // ── Step 3: Per-wallet limit ──────────────────────────────────────────────
  // Identity is the wallet address itself — no sign-in required. Ownership,
  // idempotency and the payment sender check below are all keyed off the
  // wallet, so wallet possession (proven by the on-chain payment signature)
  // is the trust boundary, not a Supabase session.
  const { count: existingCount } = await admin
    .from("nfts")
    .select("*", { count: "exact", head: true })
    .eq("owner_wallet", walletAddress)
    .eq("status", "minted");
  const owned = existingCount ?? 0;
  const maxPerWallet = config.max_per_wallet ?? 5;
  if (owned + qty > maxPerWallet) {
    throw new Error(`Exceeds wallet limit of ${maxPerWallet} NFTs (already owns ${owned})`);
  }

  // ── Step 4: Primary idempotency check (via transactions ledger) ──────────
  // Uses admin client so we catch replays from any user, not just the current one.
  const { data: confirmedPrior } = await admin
    .from("transactions")
    .select("id")
    .eq("signature", signature)
    .eq("status", "confirmed")
    .maybeSingle();
  if (confirmedPrior) return { alreadyClaimed: true, signature };

  // ── Step 5: Secondary idempotency check (via nfts.mint_signature) ────────
  // Handles the case where NFTs were assigned but the ledger write failed on a
  // prior attempt.  The user can safely retry and get their tokens back.
  const { data: alreadyMinted } = await admin
    .from("nfts")
    .select("id, token_id, name")
    .eq("mint_signature", signature);
  if (alreadyMinted && alreadyMinted.length > 0) {
    return {
      alreadyClaimed: true,
      signature,
      tokens: alreadyMinted.map((n) => ({ id: n.id, token_id: n.token_id, name: n.name })),
    };
  }

  // ── Step 6: Acquire claim lock ───────────────────────────────────────────
  // Insert a "pending" transaction record BEFORE verifying payment or assigning
  // NFTs.  Because transactions.signature has a UNIQUE constraint in the DB,
  // only one concurrent request can successfully insert — any duplicate gets a
  // unique-violation error and is immediately returned as alreadyClaimed.
  // This prevents two parallel calls with the same on-chain signature from both
  // minting NFTs against a single payment.
  const nowIso = new Date().toISOString();
  const totalAmount = Number(config.mint_price) * qty;

  const { data: lockRows, error: lockErr } = await admin
    .from("transactions")
    .insert({
      signature,
      wallet_address: walletAddress,
      tx_type: "mint",
      status: "pending",
      amount: totalAmount,
    })
    .select("id");

  if (lockErr) {
    // PostgreSQL unique-violation code
    const isUnique =
      lockErr.code === "23505" ||
      (lockErr.message ?? "").toLowerCase().includes("duplicate key") ||
      (lockErr.message ?? "").toLowerCase().includes("unique");
    if (isUnique) {
      return { alreadyClaimed: true, signature };
    }
    throw new Error(`Failed to create claim record: ${lockErr.message}`);
  }

  if (!lockRows || lockRows.length === 0) {
    // ignoreDuplicates path (if DB uses upsert semantics): treat as already claimed
    return { alreadyClaimed: true, signature };
  }

  const lockId = lockRows[0].id as string;

  // ── Steps 7-9: Payment → NFTs → Confirm (any failure cleans up the lock) ─
  try {
    // Step 7: Verify payment on-chain
    const expectedLamports = Math.round(Number(config.mint_price) * qty * 1_000_000_000);
    await verifyPaymentOnChain({
      signature,
      walletAddress,
      treasury: config.treasury_wallet,
      expectedLamports,
      rpcUrl: config.rpc_url,
    });

    // Step 8: Atomically assign NFTs
    const claimed = await atomicClaimNFTs({ admin, walletAddress, signature, qty, nowIso });

    // Step 9: Confirm the ledger record
    const { error: confirmErr } = await admin
      .from("transactions")
      .update({ status: "confirmed", nft_id: claimed[0].id, confirmed_at: nowIso })
      .eq("id", lockId);
    if (confirmErr) {
      // NFTs are assigned — log but do not fail the user.
      console.error("[claimMint] failed to confirm ledger record:", confirmErr.message);
    }

    return { alreadyClaimed: false, signature, tokens: claimed };
  } catch (err) {
    // Clean up the lock so the user can retry if appropriate
    const message = err instanceof Error ? err.message : "Unknown error";
    const isPaymentError =
      message.includes("not found on-chain") ||
      message.includes("failed on-chain") ||
      message.includes("Underpaid") ||
      message.includes("RPC");

    if (isPaymentError) {
      // Payment not confirmed or failed — delete the pending record so the
      // user can retry when/if the payment eventually confirms.
      await admin.from("transactions").delete().eq("id", lockId);
    } else {
      // NFT assignment or other server error after payment confirmed.
      // Keep the record as "failed" so the admin can reconcile.
      await admin
        .from("transactions")
        .update({ status: "failed", error_message: message })
        .eq("id", lockId);
    }

    throw err;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface VerifyPaymentParams {
  signature: string;
  walletAddress: string;
  treasury: string;
  expectedLamports: number;
  rpcUrl: string;
}

export async function verifyPaymentOnChain(params: VerifyPaymentParams): Promise<void> {
  const { signature, walletAddress, treasury, expectedLamports, rpcUrl } = params;

  let rpcRes: Response;
  try {
    rpcRes = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
          signature,
          { encoding: "json", maxSupportedTransactionVersion: 0, commitment: "confirmed" },
        ],
      }),
    });
  } catch {
    throw new Error("X1 RPC unreachable — cannot verify payment. Check network connectivity.");
  }

  if (!rpcRes.ok) {
    throw new Error(`X1 RPC returned HTTP ${rpcRes.status} — retry in a moment`);
  }

  type RpcTx = {
    result: {
      meta: { err: unknown; preBalances: number[]; postBalances: number[] } | null;
      transaction: { message: { accountKeys: string[] } };
    } | null;
    error?: { message?: string; code?: number };
  };
  const rpcJson = (await rpcRes.json()) as RpcTx;

  if (rpcJson.error) {
    throw new Error(`X1 RPC error: ${rpcJson.error.message ?? JSON.stringify(rpcJson.error)}`);
  }

  const tx = rpcJson.result;
  if (!tx) {
    throw new Error(
      "Payment not found on-chain yet — the X1 network may need a few more seconds. " +
        "Your funds are safe. Please wait and try again.",
    );
  }
  if (tx.meta?.err) {
    throw new Error(
      "Payment transaction failed on-chain — funds were NOT transferred to the treasury. " +
        "No NFT will be assigned. Check the transaction on the X1 explorer.",
    );
  }

  const keys = tx.transaction.message.accountKeys;
  const senderIdx = keys.indexOf(walletAddress);
  const treasuryIdx = keys.indexOf(treasury);
  if (senderIdx === -1 || treasuryIdx === -1) {
    throw new Error(
      "Transaction does not match the expected sender wallet and/or treasury address. " +
        "This signature cannot be used to claim NFTs.",
    );
  }

  const preT = tx.meta?.preBalances[treasuryIdx] ?? 0;
  const postT = tx.meta?.postBalances[treasuryIdx] ?? 0;
  const delta = postT - preT;
  if (delta < expectedLamports) {
    const gotXnt = (delta / 1e9).toFixed(4);
    const wantXnt = (expectedLamports / 1e9).toFixed(4);
    throw new Error(
      `Underpaid: treasury received ${gotXnt} XNT but ${wantXnt} XNT was required. ` +
        `No NFT will be assigned.`,
    );
  }
}

interface AtomicClaimParams {
  admin: DB;
  userId: string;
  walletAddress: string;
  signature: string;
  qty: number;
  nowIso: string;
}

/**
 * Atomically SELECT then UPDATE NFTs from "available" → "minted".
 *
 * The UPDATE carries `WHERE status = 'available'` on the same rows we just
 * SELECTed.  PostgreSQL processes this atomically: any row already claimed by
 * a concurrent request will no longer satisfy the status filter and will be
 * excluded.  If fewer rows are updated than requested we roll back the ones we
 * did get and surface a sold-out error.
 */
async function atomicClaimNFTs(
  params: AtomicClaimParams,
): Promise<Array<{ id: string; token_id: number; name: string }>> {
  const { admin, walletAddress, signature, qty, nowIso } = params;

  // SELECT candidates
  const { data: candidates, error: selErr } = await admin
    .from("nfts")
    .select("id, token_id, name")
    .eq("status", "available")
    .order("token_id", { ascending: true })
    .limit(qty);

  if (selErr) throw new Error(`Database error reading available NFTs: ${selErr.message}`);
  if (!candidates || candidates.length < qty) {
    throw new Error(
      candidates?.length === 0
        ? "The collection is sold out — no NFTs remain"
        : `Only ${candidates?.length ?? 0} NFT(s) left — reduce quantity`,
    );
  }

  const ids = candidates.map((n) => n.id);

  // Atomic UPDATE — only affects rows still marked 'available'
  const { data: claimed, error: claimErr } = await admin
    .from("nfts")
    .update({
      status: "minted",
      owner_wallet: walletAddress,
      mint_signature: signature,
      minted_at: nowIso,
    })
    .in("id", ids)
    .eq("status", "available")
    .select("id, token_id, name");

  if (claimErr) throw new Error(`NFT assignment failed: ${claimErr.message}`);

  if (!claimed || claimed.length < qty) {
    // Concurrent request grabbed some — roll back what we got
    if (claimed && claimed.length > 0) {
      await admin
        .from("nfts")
        .update({
          status: "available",
          owner_wallet: null,
          mint_signature: null,
          minted_at: null,
        })
        .in(
          "id",
          claimed.map((n) => n.id),
        );
    }
    throw new Error(
      "Collection sold out — another mint completed simultaneously. " +
        "Your payment is on-chain. Contact support with your transaction signature for a refund.",
    );
  }

  return claimed;
}
