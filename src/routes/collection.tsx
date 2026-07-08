import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import preReveal from "@/assets/pre-reveal.jpg";
import { CheckCircle2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/collection")({
  head: () => ({
    meta: [
      { title: "Collection — AFRICAN X1 NFT" },
      {
        name: "description",
        content:
          "5,000 Genesis NFTs on the X1 Blockchain. Every NFT represents a unique piece of African history, culture and identity.",
      },
      { property: "og:title", content: "AFRICAN X1 NFT Collection" },
      {
        property: "og:description",
        content: "Explore the AFRICAN X1 NFT genesis collection on X1 Blockchain.",
      },
    ],
  }),
  component: CollectionPage,
});

function CollectionPage() {
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("collection_config")
        .select("mint_price, max_supply, revealed, mint_paused, collection_name")
        .eq("id", 1)
        .single();
      return data;
    },
  });

  const { data: mintedCount = 0 } = useQuery({
    queryKey: ["minted-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("nfts")
        .select("*", { count: "exact", head: true })
        .eq("status", "minted");
      return count ?? 0;
    },
  });

  const maxSupply = config?.max_supply ?? 5000;
  const remaining = Math.max(0, maxSupply - mintedCount);
  const pct = maxSupply > 0 ? Math.round((mintedCount / maxSupply) * 100) : 0;
  const soldOut = remaining === 0 && maxSupply > 0;
  const paused = config?.mint_paused ?? false;

  const highlights = [
    { label: `${maxSupply.toLocaleString()} Genesis NFTs` },
    { label: "Random Reveal" },
    { label: "Powered by X1 Blockchain" },
    { label: "Mint to discover your NFT" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Full-bleed background — subtle dark overlay on the cover art */}
      <div className="absolute inset-0 -z-10">
        <img
          src={preReveal}
          alt="AFRICAN X1 Collection"
          className="h-full w-full object-cover opacity-15 blur-sm scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Main hero */}
      <section className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-2 sm:px-10">
        {/* Left — artwork */}
        <div className="relative mx-auto w-full max-w-sm md:max-w-none animate-scan">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
            <img
              src={preReveal}
              alt="AFRICAN X1 NFT — Pre-Reveal"
              className="aspect-square w-full object-cover"
            />
            {/* Corner badge */}
            <div className="absolute left-4 top-4 rounded-full border border-african-gold/60 bg-african-gold/15 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-african-gold backdrop-blur-sm">
              Genesis Collection
            </div>
            {/* Supply counter */}
            <div className="absolute bottom-4 right-4 rounded-xl border border-white/10 bg-background/70 px-4 py-2 text-right backdrop-blur-sm">
              <div className="font-mono text-xs text-muted-foreground">Minted</div>
              <div className="font-display text-xl leading-none">
                {mintedCount.toLocaleString()}
                <span className="ml-1 text-sm text-muted-foreground">
                  / {maxSupply.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{pct}% minted</span>
              <span>{remaining.toLocaleString()} remaining</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-african-gold to-cyber-cyan transition-all duration-700"
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right — copy */}
        <div className="flex flex-col gap-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-african-gold">
              X1 Blockchain · Genesis Drop
            </div>
            <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl xl:text-6xl">
              Unlock your <span className="text-gradient-gold">unique</span>
              <br />
              Africa NFT.
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground leading-relaxed">
              Every NFT represents a unique piece of African history, culture and identity. No two
              are alike. Each is yours forever on the X1 Blockchain.
            </p>
          </div>

          {/* Highlights */}
          <ul className="space-y-3">
            {highlights.map((h) => (
              <li key={h.label} className="flex items-center gap-3 text-sm">
                <CheckCircle2 size={16} className="shrink-0 text-african-gold" />
                <span>{h.label}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/mint"
              className={`inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 font-semibold text-background transition
                ${
                  soldOut || paused
                    ? "cursor-not-allowed bg-white/20 text-muted-foreground"
                    : "bg-[var(--gradient-cyber)] animate-pulse-glow hover:opacity-90"
                }`}
              aria-disabled={soldOut || paused}
              onClick={(e) => {
                if (soldOut || paused) e.preventDefault();
              }}
            >
              <Sparkles size={16} />
              {soldOut ? "Sold Out" : paused ? "Mint Paused" : "Mint Now"}
            </Link>

            {!soldOut && !paused && (
              <span className="text-xs text-muted-foreground">
                {config?.mint_price ? `${config.mint_price} XNT per NFT` : "Price set by admin"}
              </span>
            )}
          </div>

          {/* Collection info strip */}
          <div className="grid grid-cols-3 divide-x divide-white/10 border border-white/10 rounded-xl overflow-hidden">
            <Stat label="Supply" value={maxSupply.toLocaleString()} />
            <Stat label="Minted" value={mintedCount.toLocaleString()} accent />
            <Stat label="Remaining" value={remaining.toLocaleString()} />
          </div>
        </div>
      </section>

      {/* Info row */}
      <section className="border-t border-white/5 bg-background/60 backdrop-blur-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-16 sm:px-10 md:grid-cols-3">
          <InfoCard
            num="01"
            title="Payment Verified"
            desc="Your XNT payment is verified on-chain before any NFT is assigned. Your funds are never at risk."
          />
          <InfoCard
            num="02"
            title="Random Reveal"
            desc="Your NFT is hidden until the collection reveal. Every mint is a surprise — rarity unknown until then."
          />
          <InfoCard
            num="03"
            title="X1 Native"
            desc="Built entirely on X1 Blockchain. Your NFT lives on-chain as a permanent, verifiable digital asset."
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center py-4 px-2 text-center">
      <div className={`font-display text-2xl leading-none ${accent ? "text-african-gold" : ""}`}>
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function InfoCard({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="group relative border-l-2 border-l-african-gold/30 pl-6">
      <div className="font-mono text-xs text-african-gold/60">{num}</div>
      <h3 className="mt-1 font-display text-xl">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
