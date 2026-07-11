import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { processStakeNft, processClaimStake, type DB } from "@/lib/staking.logic";

const StakeInput = z.object({
  nftId: z.string().uuid(),
  walletAddress: z.string().min(32),
  rewardToken: z.enum(["x1brains", "africa", "xnt"]),
  periodDays: z.union([z.literal(30), z.literal(60), z.literal(90)]),
});

const ClaimInput = z.object({
  stakeId: z.string().uuid(),
  walletAddress: z.string().min(32),
});

async function getAdmin(): Promise<DB> {
  const { validateAdminKey, supabaseAdmin } = await import("@/integrations/supabase/client.server");
  validateAdminKey();
  return supabaseAdmin as unknown as DB;
}

/**
 * Stake an NFT for a chosen reward token + period. Wallet address is the
 * identity (no sign-in required), matching the rest of the app's trust
 * model — ownership is verified server-side against nfts.owner_wallet.
 */
export const stakeNft = createServerFn({ method: "POST" })
  .validator((data: unknown) => StakeInput.parse(data))
  .handler(async ({ data }) => {
    try {
      return await processStakeNft({ ...data, getAdmin });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[stakeNft] FAILED", { ...data, error: message });
      throw err;
    }
  });

/**
 * Claim rewards for a stake whose lock period has fully elapsed. Rejects
 * any attempt to claim early — there is no unstake-before-unlock path.
 */
export const claimStake = createServerFn({ method: "POST" })
  .validator((data: unknown) => ClaimInput.parse(data))
  .handler(async ({ data }) => {
    try {
      return await processClaimStake({ ...data, getAdmin });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[claimStake] FAILED", { ...data, error: message });
      throw err;
    }
  });
