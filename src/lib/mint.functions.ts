import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ClaimInput = z.object({
  signature: z.string().min(32),
  walletAddress: z.string().min(32),
  qty: z.number().int().min(1).max(50),
});

/**
 * Verify a user-submitted X1 transfer signature and assign NFTs.
 *
 * Trust boundary: the client sends us a signature; we independently fetch the
 * transaction from the RPC configured in collection_config, confirm the funds
 * landed at the treasury with the expected amount, and only then claim NFTs
 * for this user (using admin privileges — the nfts table is admin-only).
 */
export const claimMint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => ClaimInput.parse(data))
  .handler(async ({ data, context }) => {
    const { signature, walletAddress, qty } = data;
    const { supabase, userId } = context;

    // 1. Load config
    const { data: config, error: cfgErr } = await supabase
      .from("collection_config")
      .select("mint_price, max_per_wallet, mint_paused, whitelist_only, treasury_wallet, rpc_url, max_supply")
      .eq("id", 1)
      .single();
    if (cfgErr || !config) throw new Error("Collection config missing");
    if (config.mint_paused) throw new Error("Mint is paused");
    if (!config.treasury_wallet) throw new Error("Treasury wallet not configured");
    if (!config.rpc_url) throw new Error("RPC URL not configured");

    // 2. Whitelist gate
    if (config.whitelist_only) {
      const { data: wl } = await supabase
        .from("whitelist")
        .select("id")
        .eq("wallet_address", walletAddress)
        .maybeSingle();
      if (!wl) throw new Error("Wallet not whitelisted");
    }

    const expectedLamports = Math.round(Number(config.mint_price) * qty * 1_000_000_000);

    // 3. Verify tx on-chain via raw JSON-RPC (avoids bundling @solana/web3.js on the server/workerd)
    const rpcRes = await fetch(config.rpc_url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [signature, { encoding: "json", maxSupportedTransactionVersion: 0, commitment: "confirmed" }],
      }),
    });
    if (!rpcRes.ok) throw new Error(`RPC error ${rpcRes.status}`);
    const rpcJson = (await rpcRes.json()) as {
      result: {
        meta: { err: unknown; preBalances: number[]; postBalances: number[] } | null;
        transaction: { message: { accountKeys: string[] } };
      } | null;
    };
    const tx = rpcJson.result;
    if (!tx) throw new Error("Transaction not found on-chain yet — try again in a few seconds");
    if (tx.meta?.err) throw new Error("Transaction failed on-chain");

    const keys = tx.transaction.message.accountKeys;
    const senderIdx = keys.indexOf(walletAddress);
    const treasuryIdx = keys.indexOf(config.treasury_wallet);
    if (senderIdx === -1 || treasuryIdx === -1) throw new Error("Signature does not involve this wallet + treasury");

    const preT = tx.meta?.preBalances[treasuryIdx] ?? 0;
    const postT = tx.meta?.postBalances[treasuryIdx] ?? 0;
    const delta = postT - preT;
    if (delta < expectedLamports) {
      throw new Error(`Underpaid: expected ${expectedLamports} lamports, got ${delta}`);
    }


    // 4. Enforce max_per_wallet (count existing minted for this user)
    const { count: existingCount } = await supabase
      .from("nfts")
      .select("*", { count: "exact", head: true })
      .eq("owner_user_id", userId)
      .eq("status", "minted");
    if ((existingCount ?? 0) + qty > (config.max_per_wallet ?? 5)) {
      throw new Error(`Exceeds max ${config.max_per_wallet} per wallet`);
    }

    // 5. Idempotency: if signature already used, return prior claim
    const { data: prior } = await supabase
      .from("transactions")
      .select("id, nft_id")
      .eq("signature", signature)
      .maybeSingle();
    if (prior) {
      return { alreadyClaimed: true, signature };
    }

    // 6. Admin claim
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: available, error: availErr } = await supabaseAdmin
      .from("nfts")
      .select("id, token_id, name")
      .eq("status", "available")
      .order("token_id", { ascending: true })
      .limit(qty);
    if (availErr) throw new Error(availErr.message);
    if (!available || available.length < qty) throw new Error("Not enough NFTs available to mint");

    const nowIso = new Date().toISOString();
    const ids = available.map((n) => n.id);
    const { error: updErr } = await supabaseAdmin
      .from("nfts")
      .update({
        status: "minted",
        owner_user_id: userId,
        owner_wallet: walletAddress,
        mint_signature: signature,
        minted_at: nowIso,
      })
      .in("id", ids);
    if (updErr) throw new Error(updErr.message);

    // 7. Record one transaction row per claim (one signature = one ledger entry).
    // Multiple per-NFT rows with the same signature would violate any unique
    // constraint on the signature column and break the idempotency check above.
    const totalAmount = Number(config.mint_price) * qty;
    const { error: txErr } = await supabaseAdmin.from("transactions").insert({
      user_id: userId,
      nft_id: available[0].id, // primary NFT for the claim
      wallet_address: walletAddress,
      tx_type: "mint" as const,
      status: "confirmed" as const,
      signature,
      amount: totalAmount,
      confirmed_at: nowIso,
    });
    if (txErr) {
      console.error("[claimMint] transaction ledger insert failed:", txErr.message);
      // NFTs were already marked minted — log the error but don't throw so the
      // user gets their NFTs. The admin can reconcile via the audit logs.
    }

    return {
      alreadyClaimed: false,
      signature,
      tokens: available.map((n) => ({ id: n.id, token_id: n.token_id, name: n.name })),
    };
  });
