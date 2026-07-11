/**
 * staking.test.ts
 *
 * Unit tests for the AFRICAN X1 staking business logic (staking.logic.ts).
 * All Supabase clients are mocked — no real network calls, mirroring the
 * claimMint.test.ts pattern.
 *
 * Covered scenarios:
 *   1. Successful stake
 *   2. Reward token / period locked in at stake time (returned row reflects choice)
 *   3. XNT blocked for non-Legendary NFTs
 *   4. XNT allowed for Legendary NFTs
 *   5. Cannot stake an NFT you don't own
 *   6. Cannot stake an NFT that is already actively staked
 *   7. Claim rejected before unlock date (no early unstake)
 *   8. Successful claim after unlock — NFT becomes stakeable again
 *   9. Concurrent double-claim rejected (idempotency)
 *  10. Pure helpers: multiplier table, reward math, display status
 */
import { describe, it, expect } from "vitest";
import {
  processStakeNft,
  processClaimStake,
  periodMultiplier,
  computeReward,
  computePendingReward,
  canSelectRewardToken,
  displayStatus,
  daysRemaining,
} from "@/lib/staking.logic";

// ─── Mock helpers (same shape as claimMint.test.ts) ────────────────────────
type DBResult = { data: unknown; error: { message?: string } | null };

function makeChain(result: DBResult) {
  const self: Record<string, unknown> = {
    select: () => self,
    update: () => self,
    insert: () => self,
    eq: () => self,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
  };
  return self;
}

function createMockDB(queues: Record<string, DBResult[]>) {
  const state: Record<string, DBResult[]> = Object.fromEntries(
    Object.entries(queues).map(([k, v]) => [k, [...v]]),
  );
  return {
    from: (table: string) => {
      const q = state[table] ?? [];
      const result = q.shift() ?? { data: null, error: null };
      return makeChain(result);
    },
  };
}

const NFT_COMMON = { id: "nft-1", owner_wallet: "WalletA", status: "minted", rarity: "common" };
const NFT_LEGENDARY = {
  id: "nft-2",
  owner_wallet: "WalletA",
  status: "minted",
  rarity: "legendary",
};
const CFG_X1BRAINS = { reward_token: "x1brains", daily_rate: 10, is_active: true };
const CFG_XNT = { reward_token: "xnt", daily_rate: 0.05, is_active: true };

describe("processStakeNft", () => {
  it("1. stakes successfully and locks in the chosen token + period", async () => {
    const admin = createMockDB({
      nfts: [{ data: NFT_COMMON, error: null }],
      staking_positions: [
        { data: null, error: null }, // no existing active stake
        { data: { id: "stake-1", reward_token: "x1brains", period_days: 60 }, error: null }, // insert
      ],
      staking_config: [{ data: CFG_X1BRAINS, error: null }],
    });

    const result = (await processStakeNft({
      nftId: "nft-1",
      walletAddress: "WalletA",
      rewardToken: "x1brains",
      periodDays: 60,
      getAdmin: async () => admin as never,
    })) as { reward_token: string; period_days: number };

    // 2. Reward token / period are exactly what was requested — no drift.
    expect(result.reward_token).toBe("x1brains");
    expect(result.period_days).toBe(60);
  });

  it("3. rejects XNT for a non-Legendary NFT", async () => {
    const admin = createMockDB({
      nfts: [{ data: NFT_COMMON, error: null }],
    });

    await expect(
      processStakeNft({
        nftId: "nft-1",
        walletAddress: "WalletA",
        rewardToken: "xnt",
        periodDays: 30,
        getAdmin: async () => admin as never,
      }),
    ).rejects.toThrow(/legendary/i);
  });

  it("4. allows XNT for a Legendary NFT", async () => {
    const admin = createMockDB({
      nfts: [{ data: NFT_LEGENDARY, error: null }],
      staking_positions: [
        { data: null, error: null },
        { data: { id: "stake-2", reward_token: "xnt" }, error: null },
      ],
      staking_config: [{ data: CFG_XNT, error: null }],
    });

    const result = (await processStakeNft({
      nftId: "nft-2",
      walletAddress: "WalletA",
      rewardToken: "xnt",
      periodDays: 90,
      getAdmin: async () => admin as never,
    })) as { reward_token: string };

    expect(result.reward_token).toBe("xnt");
  });

  it("5. rejects staking an NFT you don't own", async () => {
    const admin = createMockDB({
      nfts: [{ data: NFT_COMMON, error: null }],
    });

    await expect(
      processStakeNft({
        nftId: "nft-1",
        walletAddress: "SomeoneElse",
        rewardToken: "x1brains",
        periodDays: 30,
        getAdmin: async () => admin as never,
      }),
    ).rejects.toThrow(/do not own/i);
  });

  it("6. rejects staking an NFT that already has an active stake", async () => {
    const admin = createMockDB({
      nfts: [{ data: NFT_COMMON, error: null }],
      staking_positions: [{ data: { id: "existing-stake" }, error: null }],
    });

    await expect(
      processStakeNft({
        nftId: "nft-1",
        walletAddress: "WalletA",
        rewardToken: "x1brains",
        periodDays: 30,
        getAdmin: async () => admin as never,
      }),
    ).rejects.toThrow(/already staking/i);
  });
});

describe("processClaimStake", () => {
  const ACTIVE_STAKE = {
    id: "stake-1",
    nft_id: "nft-1",
    owner_wallet: "WalletA",
    reward_token: "x1brains",
    period_days: 30,
    multiplier: 1.0,
    status: "active",
    staked_at: "2026-06-01T00:00:00.000Z",
    unlock_at: "2026-07-01T00:00:00.000Z",
    claimed_at: null,
    reward_amount: null,
  };

  it("7. rejects claiming before the unlock date — no early unstake", async () => {
    const admin = createMockDB({
      staking_positions: [{ data: ACTIVE_STAKE, error: null }],
    });

    await expect(
      processClaimStake({
        stakeId: "stake-1",
        walletAddress: "WalletA",
        now: new Date("2026-06-15T00:00:00.000Z"),
        getAdmin: async () => admin as never,
      }),
    ).rejects.toThrow(/unlock|early/i);
  });

  it("8. succeeds after the unlock date and computes a reward", async () => {
    const admin = createMockDB({
      staking_positions: [
        { data: ACTIVE_STAKE, error: null },
        {
          data: { ...ACTIVE_STAKE, status: "claimed", reward_amount: 300 },
          error: null,
        },
      ],
      nfts: [{ data: NFT_COMMON, error: null }],
      staking_config: [{ data: CFG_X1BRAINS, error: null }],
    });

    const result = (await processClaimStake({
      stakeId: "stake-1",
      walletAddress: "WalletA",
      now: new Date("2026-07-02T00:00:00.000Z"),
      getAdmin: async () => admin as never,
    })) as { status: string; reward_amount: number };

    expect(result.status).toBe("claimed");
    expect(result.reward_amount).toBeGreaterThan(0);
  });

  it("9. rejects a concurrent double-claim (already claimed)", async () => {
    const admin = createMockDB({
      staking_positions: [{ data: { ...ACTIVE_STAKE, status: "claimed" }, error: null }],
    });

    await expect(
      processClaimStake({
        stakeId: "stake-1",
        walletAddress: "WalletA",
        now: new Date("2026-07-02T00:00:00.000Z"),
        getAdmin: async () => admin as never,
      }),
    ).rejects.toThrow(/already been claimed/i);
  });
});

describe("pure helpers", () => {
  it("10a. period multipliers match spec: 1.0x / 1.25x / 1.50x", () => {
    expect(periodMultiplier(30)).toBe(1.0);
    expect(periodMultiplier(60)).toBe(1.25);
    expect(periodMultiplier(90)).toBe(1.5);
  });

  it("10b. canSelectRewardToken gates XNT to Legendary only", () => {
    expect(canSelectRewardToken("xnt", "legendary")).toBe(true);
    expect(canSelectRewardToken("xnt", "elite")).toBe(false);
    expect(canSelectRewardToken("x1brains", "common")).toBe(true);
    expect(canSelectRewardToken("africa", "common")).toBe(true);
  });

  it("10c. computeReward scales with rarity and period multiplier", () => {
    const common30 = computeReward({ dailyRate: 10, rarity: "common", periodDays: 30 });
    const legendary90 = computeReward({ dailyRate: 10, rarity: "legendary", periodDays: 90 });
    expect(legendary90).toBeGreaterThan(common30);
    // 10 * 30 * 1.0 * 1 (common rarity mult)
    expect(common30).toBeCloseTo(300, 5);
  });

  it("10d. computePendingReward accrues over time and caps at the period", () => {
    const stakedAt = new Date("2026-01-01T00:00:00.000Z");
    const halfway = computePendingReward({
      dailyRate: 10,
      rarity: "common",
      periodDays: 30,
      stakedAt,
      now: new Date("2026-01-16T00:00:00.000Z"),
    });
    const overrun = computePendingReward({
      dailyRate: 10,
      rarity: "common",
      periodDays: 30,
      stakedAt,
      now: new Date("2026-03-01T00:00:00.000Z"),
    });
    expect(halfway).toBeGreaterThan(0);
    expect(overrun).toBeCloseTo(300, 5); // capped at full-period reward
  });

  it("10e. displayStatus reflects active / ready_to_claim / claimed", () => {
    const unlockAt = new Date("2026-07-01T00:00:00.000Z");
    expect(
      displayStatus({ status: "active", unlockAt, now: new Date("2026-06-01T00:00:00.000Z") }),
    ).toBe("active");
    expect(
      displayStatus({ status: "active", unlockAt, now: new Date("2026-07-02T00:00:00.000Z") }),
    ).toBe("ready_to_claim");
    expect(
      displayStatus({ status: "claimed", unlockAt, now: new Date("2026-07-02T00:00:00.000Z") }),
    ).toBe("claimed");
  });

  it("10f. daysRemaining counts down to zero, never negative", () => {
    const unlockAt = new Date("2026-07-10T00:00:00.000Z");
    expect(daysRemaining(unlockAt, new Date("2026-07-08T00:00:00.000Z"))).toBe(2);
    expect(daysRemaining(unlockAt, new Date("2026-07-20T00:00:00.000Z"))).toBe(0);
  });
});
