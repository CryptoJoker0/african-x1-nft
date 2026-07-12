import { CheckCircle2, Plus } from "lucide-react";
import { RARITY_LABEL } from "@/components/staking/rarity";
import {
  REWARD_TOKENS,
  computePendingReward,
  daysRemaining,
  displayStatus,
  type NftRarity,
  type RewardToken,
  type StakingPeriodDays,
} from "@/lib/staking.logic";
import preReveal from "@/assets/pre-reveal.jpg";

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

export function StakingDashboard({
  positions,
  positionsLoading,
  nfts,
  config,
  onClaim,
  isClaiming,
  onStakeAnother,
}: {
  positions: StakePositionRow[];
  positionsLoading: boolean;
  nfts: WalletNft[];
  config: StakingConfigRow[];
  onClaim: (stakeId: string) => void;
  isClaiming: boolean;
  onStakeAnother: () => void;
}) {
  const activePositions = positions.filter((p) => p.status === "active");
  const now = new Date();
  const pendingRewardsTotal = activePositions.reduce((sum, p) => {
    const cfg = config.find((c) => c.reward_token === p.reward_token);
    if (!cfg) return sum;
    const nft = nfts.find((n) => n.id === p.nft_id);
    return (
      sum +
      computePendingReward({
        dailyRate: cfg.daily_rate,
        rarity: nft?.rarity ?? "common",
        periodDays: p.period_days,
        stakedAt: new Date(p.staked_at),
        now,
      })
    );
  }, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h2 className="font-display text-2xl">
          Active <span className="text-gradient-cyber">Staking Dashboard</span>
        </h2>
        <button
          onClick={onStakeAnother}
          className="inline-flex items-center gap-1.5 rounded-full border border-african-gold/40 bg-african-gold/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-african-gold transition hover:bg-african-gold/20"
        >
          <Plus size={14} /> Stake Another NFT
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="NFTs Staked" value={String(activePositions.length)} accent="green" />
        <StatCard
          label="Pending Rewards"
          value={pendingRewardsTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          accent="yellow"
        />
        <StatCard
          label="Ready to Claim"
          value={String(activePositions.filter((p) => new Date(p.unlock_at) <= now).length)}
          accent="red"
        />
        <StatCard label="Total Positions" value={String(positions.length)} />
      </section>

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
              <div
                key={p.id}
                className="overflow-hidden rounded-2xl glass-card p-4 transition hover:border-white/20"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={nft?.image_url ?? preReveal}
                    alt={nft?.name ?? "NFT"}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm">{nft?.name ?? "Unknown NFT"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {nft ? `${RARITY_LABEL[nft.rarity]} · ` : ""}
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
                        : (pending ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
                    disabled={status !== "ready_to_claim" || isClaiming}
                    onClick={() => onClaim(p.id)}
                    className="mt-3 w-full rounded-full border border-white/10 bg-white/5 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:bg-african-gold enabled:hover:text-ink"
                  >
                    {status === "ready_to_claim"
                      ? isClaiming
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
