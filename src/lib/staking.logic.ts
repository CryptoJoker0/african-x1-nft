/**
 * staking.logic.ts — pure business logic for the AFRICAN X1 staking module.
 *
 * Fully additive: reads the `nfts` table for ownership/rarity checks only,
 * never mutates it. All staking state lives in `staking_positions` /
 * `staking_config`. No TanStack Start dependencies so this is trivially
 * testable with mocked clients (mirrors the mint.logic.ts pattern).
 *
 * ══════════════════════════════════════════════════════════
 *  Rules enforced here (server-side, not just in the UI)
 * ══════════════════════════════════════════════════════════
 *  1. Only the wallet that owns the NFT (nfts.owner_wallet) can stake it.
 *  2. An NFT can only have one ACTIVE stake at a time (DB also enforces
 *     this with a partial unique index as defense in depth).
 *  3. XNT is only selectable as the reward token for Legendary NFTs.
 *  4. The reward token and period are locked in at stake time — there is
 *     no "change reward token" or "change period" path once active.
 *  5. Claiming is only possible once `unlock_at` has passed. There is no
 *     early-unstake path at all.
 *  6. After a successful claim the NFT is immediately stakeable again,
 *     because "stakeable" is derived from "no active stake row exists",
 *     not from any flag on the NFT itself.
 */

export type RewardToken = "x1brains" | "africa" | "xnt";
export type StakingPeriodDays = 30 | 60 | 90;
export type NftRarity = "legendary" | "elite" | "rare" | "uncommon" | "common";

export const REWARD_TOKENS: { value: RewardToken; label: string }[] = [
  { value: "x1brains", label: "X1Brains" },
  { value: "africa", label: "AFRICA (AF)" },
  { value: "xnt", label: "XNT" },
];

export const STAKING_PERIODS: { days: StakingPeriodDays; multiplier: number; label: string }[] = [
  { days: 30, multiplier: 1.0, label: "30 Days" },
  { days: 60, multiplier: 1.25, label: "60 Days" },
  { days: 90, multiplier: 1.5, label: "90 Days" },
];

// Rarity bonus applied on top of the token's base daily rate and the
// period multiplier. Rewards scarcer NFTs without needing a separate
// config row per rarity tier.
export const RARITY_MULTIPLIER: Record<NftRarity, number> = {
  common: 1,
  uncommon: 1.15,
  rare: 1.35,
  elite: 1.75,
  legendary: 2.5,
};

export function periodMultiplier(days: StakingPeriodDays): number {
  const p = STAKING_PERIODS.find((p) => p.days === days);
  if (!p) throw new Error(`Invalid staking period: ${days}`);
  return p.multiplier;
}

export function isValidPeriod(days: number): days is StakingPeriodDays {
  return STAKING_PERIODS.some((p) => p.days === days);
}

export function isValidRewardToken(token: string): token is RewardToken {
  return REWARD_TOKENS.some((t) => t.value === token);
}

/** XNT is gated to Legendary NFTs; every other token/rarity combo is fine. */
export function canSelectRewardToken(token: RewardToken, rarity: NftRarity): boolean {
  if (token === "xnt") return rarity === "legendary";
  return true;
}

/**
 * Total reward paid out at claim time — fixed at stake time, not prorated.
 * (You only get paid if you complete the full period; there is no partial
 * payout for an in-progress stake.)
 */
export function computeReward(params: {
  dailyRate: number;
  rarity: NftRarity;
  periodDays: StakingPeriodDays;
}): number {
  const { dailyRate, rarity, periodDays } = params;
  const mult = periodMultiplier(periodDays);
  const rarityMult = RARITY_MULTIPLIER[rarity];
  return Number((dailyRate * periodDays * mult * rarityMult).toFixed(6));
}

/** Estimated reward accrued so far — for display only, not what gets paid early. */
export function computePendingReward(params: {
  dailyRate: number;
  rarity: NftRarity;
  periodDays: StakingPeriodDays;
  stakedAt: Date;
  now: Date;
}): number {
  const { dailyRate, rarity, periodDays, stakedAt, now } = params;
  const mult = periodMultiplier(periodDays);
  const rarityMult = RARITY_MULTIPLIER[rarity];
  const elapsedDays = Math.max(
    0,
    Math.min(periodDays, (now.getTime() - stakedAt.getTime()) / 86_400_000),
  );
  return Number((dailyRate * elapsedDays * mult * rarityMult).toFixed(6));
}

export function unlockDate(stakedAt: Date, periodDays: StakingPeriodDays): Date {
  return new Date(stakedAt.getTime() + periodDays * 86_400_000);
}

export function daysRemaining(unlockAt: Date, now: Date): number {
  return Math.max(0, Math.ceil((unlockAt.getTime() - now.getTime()) / 86_400_000));
}

export type StakeDisplayStatus = "active" | "ready_to_claim" | "claimed";

export function displayStatus(params: {
  status: "active" | "claimed";
  unlockAt: Date;
  now: Date;
}): StakeDisplayStatus {
  if (params.status === "claimed") return "claimed";
  return params.now >= params.unlockAt ? "ready_to_claim" : "active";
}

// ─── Minimal DB surface this module needs (mirrors mint.logic.ts's `DB` type) ───
export interface DB {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: unknown,
      ) => {
        eq: (col2: string, val2: unknown) => {
          maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
          single: () => Promise<{ data: unknown; error: unknown }>;
        };
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        single: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
    insert: (row: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
    update: (row: Record<string, unknown>) => {
      eq: (
        col: string,
        val: unknown,
      ) => {
        eq: (
          col2: string,
          val2: unknown,
        ) => { select: (cols: string) => { single: () => Promise<{ data: unknown; error: unknown }> } };
      };
    };
  };
}

interface NftRow {
  id: string;
  owner_wallet: string | null;
  status: string;
  rarity: NftRarity;
}

interface StakingConfigRow {
  reward_token: RewardToken;
  daily_rate: number;
  is_active: boolean;
}

export interface StakeNftParams {
  nftId: string;
  walletAddress: string;
  rewardToken: string;
  periodDays: number;
  getAdmin: () => Promise<DB>;
  now?: Date;
}

export interface ClaimStakeParams {
  stakeId: string;
  walletAddress: string;
  getAdmin: () => Promise<DB>;
  now?: Date;
}

/**
 * Stake an NFT. Validates ownership, one-active-stake-per-NFT, and the
 * XNT/Legendary gate before writing anything.
 */
export async function processStakeNft(params: StakeNftParams) {
  const { nftId, walletAddress, rewardToken, periodDays, now = new Date() } = params;

  if (!walletAddress) throw new Error("Wallet not connected.");
  if (!isValidRewardToken(rewardToken)) {
    throw new Error(`Invalid reward token: ${rewardToken}`);
  }
  if (!isValidPeriod(periodDays)) {
    throw new Error(`Invalid staking period: ${periodDays} days. Choose 30, 60, or 90.`);
  }

  const db = await params.getAdmin();

  const { data: nftData, error: nftErr } = await db
    .from("nfts")
    .select("id, owner_wallet, status, rarity")
    .eq("id", nftId)
    .maybeSingle();
  if (nftErr) throw new Error("Failed to look up NFT.");
  const nft = nftData as NftRow | null;
  if (!nft) throw new Error("NFT not found.");
  if (nft.status !== "minted") {
    throw new Error("Only minted NFTs can be staked.");
  }
  if (!nft.owner_wallet || nft.owner_wallet !== walletAddress) {
    throw new Error("You do not own this NFT.");
  }

  if (!canSelectRewardToken(rewardToken, nft.rarity)) {
    throw new Error("XNT rewards are only available for Legendary NFTs.");
  }

  // One active stake per NFT — check first for a friendly error message;
  // the partial unique index in the DB is the authoritative guard against
  // a race between two concurrent requests.
  const { data: existingData, error: existingErr } = await db
    .from("staking_positions")
    .select("id")
    .eq("nft_id", nftId)
    .eq("status", "active")
    .maybeSingle();
  if (existingErr) throw new Error("Failed to check existing stakes.");
  if (existingData) throw new Error("This NFT is already staking.");

  const { data: configData, error: configErr } = await db
    .from("staking_config")
    .select("reward_token, daily_rate, is_active")
    .eq("reward_token", rewardToken)
    .maybeSingle();
  if (configErr) throw new Error("Failed to load staking config.");
  const config = configData as StakingConfigRow | null;
  if (!config || !config.is_active) {
    throw new Error(`${rewardToken} rewards are not currently available.`);
  }

  const mult = periodMultiplier(periodDays);
  const unlock = unlockDate(now, periodDays);

  const { data: inserted, error: insertErr } = await db
    .from("staking_positions")
    .insert({
      nft_id: nftId,
      owner_wallet: walletAddress,
      reward_token: rewardToken,
      period_days: periodDays,
      multiplier: mult,
      status: "active",
      staked_at: now.toISOString(),
      unlock_at: unlock.toISOString(),
    })
    .select("*")
    .single();
  if (insertErr) {
    // Unique-violation race: another request staked this NFT first.
    throw new Error("This NFT is already staking.");
  }

  return inserted;
}

interface StakingPositionRow {
  id: string;
  nft_id: string;
  owner_wallet: string;
  reward_token: RewardToken;
  period_days: StakingPeriodDays;
  multiplier: number;
  status: "active" | "claimed";
  staked_at: string;
  unlock_at: string;
  claimed_at: string | null;
  reward_amount: number | null;
}

/**
 * Claim rewards for a completed stake. Only allowed once `unlock_at` has
 * passed. There is no early-unstake path — this function is the only way
 * a staking_position ever leaves the 'active' state.
 */
export async function processClaimStake(params: ClaimStakeParams) {
  const { stakeId, walletAddress, now = new Date() } = params;
  if (!walletAddress) throw new Error("Wallet not connected.");

  const db = await params.getAdmin();

  const { data: stakeData, error: stakeErr } = await db
    .from("staking_positions")
    .select("*")
    .eq("id", stakeId)
    .maybeSingle();
  if (stakeErr) throw new Error("Failed to look up stake.");
  const stake = stakeData as StakingPositionRow | null;
  if (!stake) throw new Error("Stake not found.");
  if (stake.owner_wallet !== walletAddress) throw new Error("You do not own this stake.");
  if (stake.status !== "active") throw new Error("This stake has already been claimed.");

  const unlockAt = new Date(stake.unlock_at);
  if (now < unlockAt) {
    throw new Error(
      `Rewards unlock on ${unlockAt.toLocaleDateString()}. Early unstaking is not permitted.`,
    );
  }

  const { data: nftData, error: nftErr } = await db
    .from("nfts")
    .select("id, owner_wallet, status, rarity")
    .eq("id", stake.nft_id)
    .maybeSingle();
  if (nftErr) throw new Error("Failed to look up NFT.");
  const nft = nftData as NftRow | null;
  if (!nft) throw new Error("NFT not found.");

  const { data: configData, error: configErr } = await db
    .from("staking_config")
    .select("reward_token, daily_rate, is_active")
    .eq("reward_token", stake.reward_token)
    .maybeSingle();
  if (configErr) throw new Error("Failed to load staking config.");
  const config = configData as StakingConfigRow | null;
  if (!config) throw new Error("Staking config missing for this reward token.");

  const rewardAmount = computeReward({
    dailyRate: config.daily_rate,
    rarity: nft.rarity,
    periodDays: stake.period_days,
  });

  const { data: updated, error: updateErr } = await db
    .from("staking_positions")
    .update({
      status: "claimed",
      claimed_at: now.toISOString(),
      reward_amount: rewardAmount,
    })
    .eq("id", stakeId)
    .eq("status", "active")
    .select("*")
    .single();
  if (updateErr) {
    // Concurrent claim already flipped status away from 'active'.
    throw new Error("This stake has already been claimed.");
  }

  return updated;
}
