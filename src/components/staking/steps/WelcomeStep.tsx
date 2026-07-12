import { Coins, Lock, Shield, Sparkles } from "lucide-react";

const POINTS = [
  { icon: Lock, text: "Stake your Genesis NFT" },
  { icon: Coins, text: "Earn rewards" },
  { icon: Sparkles, text: "Only 50 Genesis NFTs exist" },
  { icon: Shield, text: "Secure staking powered by X1 Blockchain" },
];

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center gap-8 rounded-2xl glass-card px-6 py-14 text-center sm:px-16">
      <div className="text-[10px] uppercase tracking-[0.35em] text-african-gold">
        Genesis Staking
      </div>
      <h2 className="font-display text-3xl sm:text-5xl">
        Stake your legacy.
        <br />
        <span className="text-gradient-cyber">Earn your reward.</span>
      </h2>
      <p className="max-w-lg text-sm text-muted-foreground sm:text-base">
        AFRICAN X1 Genesis Staking lets holders lock a Genesis NFT and earn X1Brains, AFRICA (AF),
        or — for Legendary holders — exclusive XNT rewards.
      </p>

      <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
        {POINTS.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-african-gold/10 text-african-gold">
              <Icon size={16} />
            </div>
            <span className="text-sm">{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="btn-staking group relative mt-2 inline-flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-[position:0%_50%] px-8 py-3.5 text-sm font-bold text-ink transition-[background-position,filter] duration-500 hover:bg-[position:100%_50%] hover:brightness-110"
        style={{ boxShadow: "var(--shadow-glow-staking)" }}
      >
        Begin Staking
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      </button>
    </div>
  );
}
