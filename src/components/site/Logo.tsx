import logo from "@/assets/african-x1-logo.asset.json";

export function Logo({ size = 40, withWord = true }: { size?: number; withWord?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative shrink-0 overflow-hidden rounded-sm ring-1 ring-african-gold/40"
        style={{ width: size, height: size, boxShadow: "0 0 14px rgba(212,175,55,0.25)" }}
      >
        <img src={logo.url} alt="African X1 NFT logo" className="h-full w-full object-cover" />
      </div>
      {withWord && (
        <div className="leading-none">
          <div className="font-display text-[22px] leading-none tracking-tight text-foreground">
            African <span className="serif-italic text-gradient-gold">X1</span>
          </div>
          <div className="mt-1 label-xs">Genesis · X1 Chain</div>
        </div>
      )}
    </div>
  );
}
