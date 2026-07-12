import { ChevronLeft, ShieldCheck } from "lucide-react";

export function VerificationStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl glass-card px-6 py-14 text-center sm:px-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-african-gold/30 bg-african-gold/10 text-african-gold">
        <ShieldCheck size={28} />
      </div>
      <h2 className="font-display text-2xl sm:text-3xl">Genesis NFT verification</h2>
      <p className="max-w-lg text-sm text-muted-foreground sm:text-base">
        Only <span className="text-foreground">AFRICAN X1 Genesis NFTs</span> are eligible for
        staking. Once you connect your wallet later in this flow, we&apos;ll automatically verify
        that you hold one — no manual proof needed.
      </p>
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-xs text-muted-foreground">
        If no eligible NFT is found in your wallet, you&apos;ll see:
        <p className="mt-1 font-semibold text-foreground">
          &ldquo;No AFRICAN X1 Genesis NFT detected in this wallet.&rdquo;
        </p>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft size={15} /> Back
        </button>
        <button
          onClick={onNext}
          className="btn-staking group relative inline-flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-[position:0%_50%] px-7 py-2.5 text-sm font-bold text-ink transition-[background-position,filter] duration-500 hover:bg-[position:100%_50%] hover:brightness-110"
          style={{ boxShadow: "var(--shadow-glow-staking)" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
