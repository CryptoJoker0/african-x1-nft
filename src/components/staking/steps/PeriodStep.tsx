import { ChevronLeft } from "lucide-react";
import { STAKING_PERIODS, type StakingPeriodDays } from "@/lib/staking.logic";

export function PeriodStep({
  value,
  onSelect,
  onNext,
  onBack,
}: {
  value: StakingPeriodDays | null;
  onSelect: (d: StakingPeriodDays) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const now = new Date();

  return (
    <div className="rounded-2xl glass-card p-6 sm:p-10">
      <p className="text-[10px] uppercase tracking-[0.3em] text-african-gold">Step 4</p>
      <h2 className="mt-2 font-display text-2xl sm:text-3xl">Choose your lock period</h2>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        Longer lock periods earn a higher reward multiplier. Rewards are paid out in full only once
        the period completes.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {STAKING_PERIODS.map((p) => {
          const selected = value === p.days;
          const unlockAt = new Date(now.getTime() + p.days * 86_400_000);
          return (
            <button
              key={p.days}
              onClick={() => onSelect(p.days)}
              className={`flex flex-col gap-3 rounded-xl border-2 p-5 text-left transition ${
                selected
                  ? "border-african-gold bg-african-gold/10 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <span className="font-display text-2xl">{p.label}</span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Multiplier</span>
                  <span className="font-semibold text-african-gold">
                    {p.multiplier.toFixed(2)}×
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Unlock date</span>
                  <span className="font-semibold text-foreground">
                    {unlockAt.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

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
