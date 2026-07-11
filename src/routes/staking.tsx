import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Sparkles, Wallet, ExternalLink, CheckCircle2 } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { WalletButton } from "@/components/site/WalletButton";
import { supabase } from "@/integrations/supabase/client";
import { stakeNft, claimStake } from "@/lib/staking.functions";
import {
  REWARD_TOKENS,
  STAKING_PERIODS,
  canSelectRewardToken,
  computePendingReward,
  daysRemaining,
  displayStatus,
  type NftRarity,
  type RewardToken,
  type StakingPeriodDays,
} from "@/lib/staking.logic";
import preReveal from "@/assets/pre-reveal.jpg";

export const Route = createFileRoute("/staking")({
  head: () => ({
    meta: [
      { title: "Staking — AFRICAN X1" },
      {
        name: "description",
        content: "Stake your AFRICAN X1 NFTs to earn X1Brains, AFRICA (AF), or XNT rewards.",
      },
    ],
  }),
  component: StakingPage,
});

interface WalletNft {
  id: string;
  token_id: number;
  name: string;
  image_url: string | null;
  rarity: NftRarity;
}

interface StakingConfigRow {
  reward_token: RewardToken;
  display_name: string;
  daily_rate: number;
  is_active: boolean;
}

interface StakePositionRow {
  id: string;
  nft_id: string;
  reward_token: RewardToken;
  period_days: StakingPeriodDays;
  multiplier: number;
  status: "active" | "claimed";
  staked_at: string;
  unlock_at: string;
  claimed_at: string | null;
  reward_amount: number | null;
}

const RARITY_LABEL: Record<NftRarity, string> = {
  legendary: "Legendary",
  elite: "Elite",
  rare: "Rare",
  uncommon: "Uncommon",
  common: "Common",
};

function StakingPage() {
  const { address, status: walletStatus } = useWallet();
  const queryClient = useQueryClient();

  const { data: nfts = [], isLoading: nftsLoading } = useQuery({
    enabled: !!address,
    queryKey: ["staking-nfts", address],
    queryFn: async () => {
      const { data } = await supabase
        .from("nfts")
        .select("id, token_id, name, image_url, rarity")
        .eq("owner_wallet", address!)
        .eq("status", "minted")
        .order("token_id", { ascending: true });
      return (data ?? []) as WalletNft[];
    },
  });

  const { data: positions = [], isLoading: positionsLoading } = useQuery({
    enabled: !!address,
    queryKey: ["staking-positions", address],
    queryFn: async () => {
      const { data } = await supabase
        .from("staking_positions")
        .select("*")
        .eq("owner_wallet", address!)
        .order("staked_at", { ascending: false });
      return (data ?? []) as StakePositionRow[];
    },
    refetchInterval: 30_000,
  });

  const { data: config = [] } = useQuery({
    queryKey: ["staking-config"],
    queryFn: async () => {
      const { data } = await supabase.from("staking_config").select("*");
      return (data ?? []) as StakingConfigRow[];
    },
    staleTime: 5 * 60_000,
  });

  const activePositions = positions.filter((p) => p.status === "active");
  const stakedNftIds = new Set(activePositions.map((p) => p.nft_id));
  const stakeableNfts = nfts.filter((n) => !stakedNftIds.has(n.id));

  const [selectedNftId, setSelectedNftId] = useState<string | null>(null);
  const [rewardToken, setRewardToken] = useState<RewardToken | null>(null);
  const [periodDays, setPeriodDays] = useState<StakingPeriodDays | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedNft = stakeableNfts.find((n) => n.id === selectedNftId) ?? null;

  const stakeMutation = useMutation({
    mutationFn: async () => {
      if (!address || !selectedNftId || !rewardToken || !periodDays) {
        throw new Error("Select an NFT, reward token, and staking period first.");
      }
      return stakeNft({
        data: { nftId: selectedNftId, walletAddress: address, rewardToken, periodDays },
      });
    },
    onSuccess: () => {
      setError(null);
      setSelectedNftId(null);
      setRewardToken(null);
      setPeriodDays(null);
      queryClient.invalidateQueries({ queryKey: ["staking-positions", address] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Failed to stake."),
  });

  const claimMutation = useMutation({
    mutationFn: async (stakeId: string) => {
      if (!address) throw new Error("Wallet not connected.");
      return claimStake({ data: { stakeId, walletAddress: address } });
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["staking-positions", address] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Failed to claim."),
  });

  const pendingRewardsTotal = useMemo(() => {
    const now = new Date();
    return activePositions.reduce((sum, p) => {
      const cfg = config.find((c) => c.reward_token === p.reward_token);
      if (!cfg) return sum;
      const nft = nfts.find((n) => n.id === p.nft_id);
      const rarity = nft?.rarity ?? "common";
      return (
        sum +
        computePendingReward({
          dailyRate: cfg.daily_rate,
          rarity,
          periodDays: p.period_days,
          stakedAt: new Date(p.staked_at),
          now,
        })
      );
    }, 0);
  }, [activePositions, config, nfts]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8 flex flex-col items-center gap-4 text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-african-gold">Earn while you hold</div>
        <h1 className="font-display text-3xl sm:text-4xl">
          Africa <span className="text-gradient-cyber">Staking</span>
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Lock an AFRICAN X1 NFT for 30, 60, or 90 days and earn X1Brains, AFRICA (AF), or —
          for Legendary holders — XNT. Rewards unlock only once the full period elapses.
        </p>
        <a
          href="https://barbie.market"
          target="_blank"
          rel="noreferrer"
          className="btn-barbie group relative inline-flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-[position:0%_50%] px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-[background-position,filter] duration-500 hover:bg-[position:100%_50%] hover:brightness-110"
          style={{ boxShadow: "var(--shadow-glow-barbie)" }}
        >
          <Sparkles size={15} />
          Buy AF on Barbie
          <ExternalLink size={13} />
        </a>
      </header>

      {walletStatus !== "connected" ? (
        <div className="flex flex-col items-center gap-6 rounded-2xl glass-card p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
            <Wallet size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-display text-xl">Connect your wallet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Staking is tied to your wallet — no sign-in needed.
            </p>
          </div>
          <WalletButton />
        </div>
      ) : (
        <div className="space-y-10">
          {/* ── Dashboard ── */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="NFTs in Wallet" value={String(nfts.length)} />
            <StatCard label="Active Staking" value={String(activePositions.length)} accent="green" />
            <StatCard
              label="Pending Rewards"
              value={pendingRewardsTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              accent="yellow"
            />
            <StatCard
              label="Ready to Claim"
              value={String(
                activePositions.filter((p) => new Date(p.unlock_at) <= new Date()).length,
              )}
              accent="red"
            />
          </section>

          {/* ── Active / past stakes ── */}
          {(positionsLoading || positions.length > 0) && (
            <section>
              <h2 className="mb-4 font-display text-xl">Your Stakes</h2>
              {positionsLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {positions.map((p) => {
                    const nft = nfts.find((n) => n.id === p.nft_id);
                    const now = new Date();
                    const unlockAt = new Date(p.unlock_at);
                    const status = displayStatus({ status: p.status, unlockAt, now });
                    const cfg = config.find((c) => c.reward_token === p.reward_token);
                    const tokenLabel =
                      cfg?.display_name ??
                      REWARD_TOKENS.find((t) => t.value === p.reward_token)?.label ??
                      p.reward_token;
                    const remaining = daysRemaining(unlockAt, now);
                    const pending = cfg
                      ? computePendingReward({
                          dailyRate: cfg.daily_rate,
                          rarity: nft?.rarity ?? "common",
                          periodDays: p.period_days,
                          stakedAt: new Date(p.staked_at),
                          now,
                        })
                      : null;

                    return (
                      <div key={p.id} className="overflow-hidden rounded-2xl glass-card p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={nft?.image_url ?? preReveal}
                            alt={nft?.name ?? "NFT"}
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-sm">
                              {nft?.name ?? "Unknown NFT"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {p.period_days} days · {p.multiplier.toFixed(2)}× · {tokenLabel}
                            </p>
                          </div>
                          <StatusPill status={status} />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <p className="label-xs">Pending Rewards</p>
                            <p className="mt-0.5 font-semibold text-yellow-300">
                              {p.status === "claimed"
                                ? (p.reward_amount ?? 0).toLocaleString()
                                : (pending ?? 0).toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}
                            </p>
                          </div>
                          <div>
                            <p className="label-xs">
                              {status === "ready_to_claim" ? "Unlocked" : "Days Remaining"}
                            </p>
                            <p className="mt-0.5 font-semibold">
                              {p.status === "claimed" ? "—" : `${remaining}d`}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="label-xs">Unlock Date</p>
                            <p className="mt-0.5 font-semibold">
                              {unlockAt.toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>

                        {p.status === "active" && (
                          <button
                            disabled={status !== "ready_to_claim" || claimMutation.isPending}
                            onClick={() => claimMutation.mutate(p.id)}
                            className="mt-3 w-full rounded-full border border-white/10 bg-white/5 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:bg-african-gold enabled:hover:text-ink"
                          >
                            {status === "ready_to_claim"
                              ? claimMutation.isPending
                                ? "Claiming…"
                                : "Claim Rewards"
                              : "Locked"}
                          </button>
                        )}
                        {p.status === "claimed" && (
                          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-300">
                            <CheckCircle2 size={13} /> Claimed
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── Stake a new NFT ── */}
          <section className="rounded-2xl glass-card p-6">
            <h2 className="mb-4 font-display text-xl">Stake an NFT</h2>

            {nftsLoading ? (
              <div className="h-24 animate-pulse rounded-xl bg-white/5" />
            ) : stakeableNfts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {nfts.length === 0
                  ? "This wallet doesn't hold any AFRICAN X1 NFTs yet."
                  : "All of your NFTs are currently staking."}
              </p>
            ) : (
              <div className="space-y-6">
                {/* NFT picker */}
                <div>
                  <p className="label-xs mb-2">1. Choose an NFT</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                    {stakeableNfts.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setSelectedNftId(n.id);
                          if (rewardToken === "xnt" && n.rarity !== "legendary") setRewardToken(null);
                        }}
                        className={`overflow-hidden rounded-xl border-2 transition ${
                          selectedNftId === n.id
                            ? "border-african-gold shadow-[0_0_16px_rgba(212,175,55,0.35)]"
                            : "border-transparent hover:border-white/20"
                        }`}
                      >
                        <img
                          src={n.image_url ?? preReveal}
                          alt={n.name}
                          className="aspect-square w-full object-cover"
                        />
                        <div className="bg-black/40 px-1.5 py-1 text-left">
                          <p className="truncate text-[10px] font-semibold">#{n.token_id}</p>
                          <p className="truncate text-[9px] text-muted-foreground">
                            {RARITY_LABEL[n.rarity]}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reward token */}
                <div>
                  <p className="label-xs mb-2">2. Choose a reward token</p>
                  <div className="flex flex-wrap gap-2">
                    {REWARD_TOKENS.map((t) => {
                      const allowed = selectedNft
                        ? canSelectRewardToken(t.value, selectedNft.rarity)
                        : true;
                      return (
                        <button
                          key={t.value}
                          disabled={!selectedNft || !allowed}
                          onClick={() => setRewardToken(t.value)}
                          title={!allowed ? "XNT is only available for Legendary NFTs." : undefined}
                          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-30 ${
                            rewardToken === t.value
                              ? "border-african-gold bg-african-gold/15 text-african-gold"
                              : "border-white/15 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {t.label}
                          {t.value === "xnt" && <span className="ml-1 opacity-60">(Legendary)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Period */}
                <div>
                  <p className="label-xs mb-2">3. Choose a staking period</p>
                  <div className="flex flex-wrap gap-2">
                    {STAKING_PERIODS.map((p) => (
                      <button
                        key={p.days}
                        disabled={!selectedNft || !rewardToken}
                        onClick={() => setPeriodDays(p.days)}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 ${
                          periodDays === p.days
                            ? "border-african-gold bg-african-gold/15 text-african-gold"
                            : "border-white/15 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p.label} · {p.multiplier.toFixed(2)}×
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  disabled={!selectedNft || !rewardToken || !periodDays || stakeMutation.isPending}
                  onClick={() => stakeMutation.mutate()}
                  className="btn-staking group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-[position:0%_50%] px-6 py-3 text-sm font-bold text-ink transition-[background-position,filter] duration-500 hover:bg-[position:100%_50%] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ boxShadow: "var(--shadow-glow-staking)" }}
                >
                  <Lock size={15} />
                  {stakeMutation.isPending ? "Staking…" : "Stake NFT"}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "yellow" | "red";
}) {
  const accentClass =
    accent === "green"
      ? "text-emerald-400"
      : accent === "yellow"
        ? "text-yellow-300"
        : accent === "red"
          ? "text-red-400"
          : "text-foreground";
  return (
    <div className="rounded-2xl glass-card p-4 text-center">
      <p className="label-xs">{label}</p>
      <p className={`mt-1 font-display text-2xl ${accentClass}`}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: "active" | "ready_to_claim" | "claimed" }) {
  if (status === "claimed") {
    return (
      <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Claimed
      </span>
    );
  }
  if (status === "ready_to_claim") {
    return (
      <span className="shrink-0 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-400">
        Ready to Claim
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
      Active
    </span>
  );
}
