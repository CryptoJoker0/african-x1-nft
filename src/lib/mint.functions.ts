import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { processPreflight, processClaimMint, type DB } from "@/lib/mint.logic";

const PreflightInput = z.object({
  walletAddress: z.string().min(32),
  qty: z.number().int().min(1).max(50),
});

const ClaimInput = z.object({
  signature: z.string().min(32),
  walletAddress: z.string().min(32),
  qty: z.number().int().min(1).max(50),
});

/**
 * Server-side pre-flight check — runs BEFORE the user submits payment.
 *
 * No Supabase session required: wallet address is the identity.
 * The on-chain payment verification independently confirms the sender
 * matches walletAddress, so sign-in is not part of the trust model here.
 *
 * Validates:
 *   1. Service role key present
 *   2. Supabase reachable
 *   3. Config complete (treasury + RPC set, not paused)
 *   4. Wallet whitelisted (if whitelist mode on)
 *   5. Per-wallet limit not already reached
 *   6. Enough NFTs available
 */
export const preflightMint = createServerFn({ method: "POST" })
  .validator((data: unknown) => PreflightInput.parse(data))
  .handler(async ({ data }) => {
    const { walletAddress, qty } = data;

    const getAdmin = async (): Promise<DB> => {
      const { validateAdminKey, supabaseAdmin } =
        await import("@/integrations/supabase/client.server");
      validateAdminKey();
      return supabaseAdmin as unknown as DB;
    };

    return processPreflight({ walletAddress, qty, getAdmin });
  });

/**
 * Verify a confirmed X1 on-chain payment and atomically assign NFTs.
 *
 * Trust boundary: the client supplies a signature; the server independently
 * fetches the transaction from the RPC node and confirms the funds reached the
 * treasury with the correct amount.  NFTs are only assigned after verification.
 * Every failure is logged to stdout.
 */
export const claimMint = createServerFn({ method: "POST" })
  .validator((data: unknown) => ClaimInput.parse(data))
  .handler(async ({ data }) => {
    const { signature, walletAddress, qty } = data;

    const getAdmin = async (): Promise<DB> => {
      const { validateAdminKey, supabaseAdmin } =
        await import("@/integrations/supabase/client.server");
      validateAdminKey();
      return supabaseAdmin as unknown as DB;
    };

    try {
      return await processClaimMint({ signature, walletAddress, qty, getAdmin });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";

      // Structured log — captured by Cloudflare Workers / server logs
      console.error("[claimMint] FAILED", { walletAddress, signature, qty, error: message });

      // Best-effort audit trail in the database
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await (supabaseAdmin as unknown as DB).from("audit_logs").insert({
          action: "mint_failed",
          entity_type: "mint",
          metadata: { error: message, signature, walletAddress, qty },
        });
      } catch (logErr) {
        console.error(
          "[claimMint] audit log insert failed:",
          logErr instanceof Error ? logErr.message : logErr,
        );
      }

      throw err; // Re-throw — client receives the original error message
    }
  });
