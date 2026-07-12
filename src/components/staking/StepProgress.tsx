import { Check } from "lucide-react";

export const WIZARD_STEPS = [
  { step: 1, label: "Welcome" },
  { step: 2, label: "Verify" },
  { step: 3, label: "Reward" },
  { step: 4, label: "Period" },
  { step: 5, label: "Wallet" },
  { step: 6, label: "Review" },
] as const;

export function StepProgress({ current }: { current: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center">
        {WIZARD_STEPS.map((s, i) => {
          const done = s.step < current;
          const active = s.step === current;
          return (
            <div key={s.step} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300 ${
                    done
                      ? "border-african-gold bg-african-gold text-ink"
                      : active
                        ? "border-african-gold bg-african-gold/15 text-african-gold shadow-[0_0_16px_rgba(212,175,55,0.4)]"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground"
                  }`}
                >
                  {done ? <Check size={14} /> : s.step}
                </div>
                <span
                  className={`hidden text-[10px] uppercase tracking-widest sm:block ${
                    active
                      ? "text-african-gold"
                      : done
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < WIZARD_STEPS.length - 1 && (
                <div
                  className={`mx-1.5 h-px flex-1 transition-colors duration-300 sm:mx-2 ${
                    done ? "bg-african-gold/60" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
