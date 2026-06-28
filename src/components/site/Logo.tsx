import logo from "@/assets/african-x1-logo.asset.json";

export function Logo({ size = 36, withWord = true }: { size?: number; withWord?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative shrink-0 overflow-hidden rounded-full ring-1 ring-african-gold/40"
        style={{ width: size, height: size, boxShadow: "0 0 16px rgba(212,175,55,0.35)" }}
      >
        <img src={logo.url} alt="African X1 NFT logo" className="h-full w-full object-cover" />
      </div>
      {withWord && (
        <div className="leading-none">
          <div className="font-display text-[15px] font-bold tracking-[0.18em] text-gradient-gold">
            AFRICAN X1
          </div>
          <div className="mt-0.5 font-display text-[10px] tracking-[0.32em] text-cyber-cyan/80">
            NFT · X1 CHAIN
          </div>
        </div>
      )}
    </div>
  );
}
