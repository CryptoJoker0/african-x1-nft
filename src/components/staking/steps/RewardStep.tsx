import { ChevronLeft, Lock } from "lucide-react";
import { REWARD_TOKENS, type RewardToken } from "@/lib/staking.logic";

const DESCRIPTIONS: Record<RewardToken, string> = {
  x1brains: "The utility token of the X1 ecosystem.",
  africa: "The community token of the AFRICAN X1 collection.",
  xnt: "The native gas token of X1 Mainnet — reserved for Legendary holders.",
};

export function RewardStep({
  value,
  onSelect,
  onNext,
  onBack,
}: {
  value: RewardToken | null;
  onSelect: (t: RewardToken) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="rounded-2xl glass-card p-6 sm:p-10">
      <p className="text-[10px] uppercase tracking-[0.3em] text-african-gold">Step 3</p>
      <h2 className="mt-2 font-display text-2xl sm:text-3xl">Choose your reward token</h2>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        Pick one reward token to earn while your NFT is staked.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {REWARD_TOKENS.map((t) => {
          const isXnt = t.value === "xnt";
          const selected = value === t.value;
          return (
            <button
              key={t.value}
              onClick={() => onSelect(t.value)}
              className={`relative flex flex-col items-start gap-2 rounded-xl border-2 p-5 text-left transition ${
                selected
                  ? "border-african-gold bg-african-gold/10 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              {isXnt && (
                <span className="absolute -top-2.5 right-4 flex items-center gap-1 rounded-full border border-african-gold/50 bg-background px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-african-gold">
                  <Lock size={9} /> Legendary
                </span>
              )}
              <span className="font-display text-xl">{t.label}</span>
              <span className="text-xs text-muted-foreground">{DESCRIPTIONS[t.value]}</span>
            </button>
          );
        })}
      </div>

      {value === "xnt" && (
        <div className="mt-4 rounded-xl border border-african-gold/30 bg-african-gold/10 px-4 py-3 text-xs text-african-gold">
          Legendary NFT holders unlock exclusive XNT rewards. We&apos;ll confirm eligibility once
          your wallet is connected.
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft size={15} /> Back
        </button>
        <button
          disabled={!value}
          onClick={onNext}
          className="btn-staking group relative inline-flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-[position:0%_50%] px-7 py-2.5 text-sm font-bold text-ink transition-[background-position,filter] duration-500 hover:bg-[position:100%_50%] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ boxShadow: "var(--shadow-glow-staking)" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
