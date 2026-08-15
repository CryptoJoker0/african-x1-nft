import { ChevronLeft, Copy, Lock } from "lucide-react";
import { useState } from "react";
import { RARITY_LABEL } from "@/components/staking/rarity";
import {
  REWARD_TOKENS,
  computeReward,
  periodMultiplier,
  type NftRarity,
  type RewardToken,
  type StakingPeriodDays,
} from "@/lib/staking.logic";
import preReveal from "@/assets/pre-reveal.jpg";

interface StakingConfigRow {
  reward_token: RewardToken;
  display_name: string;
  daily_rate: number;
  is_active: boolean;
}

export function ReviewStep({
  nft,
  rewardToken,
  periodDays,
  config,
  stakingGasFeeXnt,
  walletAddress,
  onStake,
  onBack,
  isStaking,
  stakeStage,
  error,
}: {
  nft: { name: string; token_id: number; image_url: string | null; rarity: NftRarity };
  rewardToken: RewardToken;
  periodDays: StakingPeriodDays;
  config: StakingConfigRow[];
  stakingGasFeeXnt: number;
  walletAddress: string;
  onStake: () => void;
  onBack: () => void;
  isStaking: boolean;
  stakeStage: "idle" | "preparing" | "signing" | "confirming" | "staking";
  error: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const cfg = config.find((c) => c.reward_token === rewardToken);
  const tokenLabel =
    cfg?.display_name ?? REWARD_TOKENS.find((t) => t.value === rewardToken)?.label ?? rewardToken;
  const estimatedReward = cfg
    ? computeReward({ dailyRate: cfg.daily_rate, rarity: nft.rarity, periodDays })
    : null;
  const unlockAt = new Date(Date.now() + periodDays * 86_400_000);

  return (
    <div className="rounded-2xl glass-card p-6 sm:p-10">
      <p className="text-[10px] uppercase tracking-[0.3em] text-african-gold">Step 6</p>
      <h2 className="mt-2 font-display text-2xl sm:text-3xl">Review &amp; confirm</h2>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row">
        <img
          src={nft.image_url ?? preReveal}
          alt={nft.name}
          className="h-40 w-40 shrink-0 self-center rounded-xl object-cover sm:self-start"
        />
        <div className="flex-1 space-y-3 text-sm">
          <Row
            label="NFT selected"
            value={`${nft.name} · #${nft.token_id} · ${RARITY_LABEL[nft.rarity]}`}
          />
          <Row label="Reward token" value={tokenLabel} />
          <Row
            label="Lock period"
            value={`${periodDays} days · ${periodMultiplier(periodDays).toFixed(2)}× multiplier`}
          />
          <Row
            label="Estimated rewards"
            value={
              estimatedReward !== null
                ? `${estimatedReward.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${tokenLabel}`
                : "—"
            }
            accent="text-yellow-300"
          />
          <Row
            label="Unlock date"
            value={unlockAt.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          />
          <Row
            label="Staking gas fee"
            value={`${stakingGasFeeXnt.toFixed(2)} XNT (≈ $3 USD)`}
            accent="text-african-gold"
          />
          <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-2">
            <span className="label-xs pt-0.5">Wallet address</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(walletAddress);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex items-center gap-1.5 font-mono text-xs text-foreground hover:text-african-gold"
            >
              <span className="break-all text-right">{walletAddress}</span>
              <Copy size={12} className={copied ? "text-african-gold" : ""} />
            </button>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="label-xs">Status</span>
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-400">
              <Lock size={12} /> Payment required before staking
            </span>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onBack}
          disabled={isStaking}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-40"
        >
          <ChevronLeft size={15} /> Back
        </button>
        <button
          onClick={onStake}
          disabled={isStaking}
          className="btn-staking group relative inline-flex flex-1 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-[position:0%_50%] px-8 py-3.5 text-sm font-bold text-ink transition-[background-position,filter] duration-500 hover:bg-[position:100%_50%] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ boxShadow: "var(--shadow-glow-staking)" }}
        >
          <Lock size={15} />
          {isStaking
            ? stakeStage === "signing"
              ? "Approve fee in wallet…"
              : stakeStage === "confirming"
                ? "Confirming fee payment…"
                : stakeStage === "staking"
                  ? "Creating stake…"
                  : "Preparing payment…"
            : `PAY ${stakingGasFeeXnt.toFixed(2)} XNT & STAKE`}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
      <span className="label-xs">{label}</span>
      <span className={`text-right font-semibold ${accent ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}
