import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import cover from "@/assets/african-x1-cover.png.asset.json";
import preReveal from "@/assets/pre-reveal.jpg";
import { CheckCircle2, Sparkles } from "lucide-react";

type NftRarity = "legendary" | "elite" | "rare" | "uncommon" | "common";

const RARITY_STYLES: Record<NftRarity, { badge: string; glow: string; label: string }> = {
  legendary: { badge: "border-african-gold text-african-gold bg-african-gold/10", glow: "shadow-[0_0_18px_rgba(212,175,55,0.35)]", label: "Legendary" },
  elite:     { badge: "border-purple-400 text-purple-300 bg-purple-400/10",       glow: "shadow-[0_0_14px_rgba(192,132,252,0.3)]",  label: "Elite" },
  rare:      { badge: "border-cyber-cyan text-cyber-cyan bg-cyber-cyan/10",        glow: "shadow-[0_0_14px_rgba(0,255,255,0.2)]",   label: "Rare" },
  uncommon:  { badge: "border-emerald-400 text-emerald-400 bg-emerald-400/10",     glow: "shadow-[0_0_10px_rgba(52,211,153,0.2)]",  label: "Uncommon" },
  common:    { badge: "border-white/20 text-muted-foreground bg-white/5",          glow: "",                                        label: "Common" },
};

export const Route = createFileRoute("/collection")({
  head: () => ({
    meta: [
      { title: "Collection — AFRICAN X1 NFT" },
      {
        name: "description",
        content:
          "50 Genesis NFTs on the X1 Blockchain. Every NFT represents a unique piece of African history, culture and identity.",
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

  const { data: nfts = [] } = useQuery({
    queryKey: ["nfts-collection"],
    queryFn: async () => {
      const { data } = await supabase
        .from("nfts")
        .select("id, token_id, name, rarity, status")
        .order("token_id", { ascending: true });
      return data ?? [];
    },
  });

  const maxSupply = config?.max_supply ?? 50;
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
          src={cover.url}
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
              src={cover.url}
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

      {/* NFT Grid */}
      <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="label-xs text-african-gold">Genesis Collection</div>
            <h2 className="mt-1 font-display text-3xl">
              All <span className="text-gradient-gold">{maxSupply}</span> NFTs
            </h2>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <span className="text-african-gold font-semibold">{mintedCount}</span> minted
            &nbsp;·&nbsp;
            <span>{remaining} remaining</span>
          </div>
        </div>

        {nfts.length === 0 ? (
          /* Empty state — NFTs not seeded yet */
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: maxSupply }).map((_, i) => (
              <NftCard
                key={i}
                tokenId={i + 1}
                name={`AFRICAN X1 #${String(i + 1).padStart(3, "0")}`}
                rarity="common"
                status="available"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {nfts.map((nft) => (
              <NftCard
                key={nft.id}
                tokenId={nft.token_id}
                name={nft.name}
                rarity={(nft.rarity as NftRarity) ?? "common"}
                status={nft.status ?? "available"}
              />
            ))}
          </div>
        )}
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

function NftCard({
  tokenId,
  name,
  rarity,
  status,
}: {
  tokenId: number;
  name: string;
  rarity: NftRarity;
  status: string;
}) {
  const styles = RARITY_STYLES[rarity] ?? RARITY_STYLES.common;
  const isMinted = status === "minted";

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/20 hover:-translate-y-0.5 ${styles.glow}`}
    >
      {/* Pre-reveal image — never the real artwork */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={preReveal}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Overlay with token number */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        <div className="absolute bottom-2 left-0 right-0 text-center font-mono text-lg font-bold leading-none text-white drop-shadow">
          #{String(tokenId).padStart(3, "0")}
        </div>
        {/* Minted badge */}
        {isMinted && (
          <div className="absolute right-2 top-2 rounded-full bg-african-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-background">
            Minted
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex flex-col gap-1 p-3">
        <div className="truncate font-display text-sm leading-tight">{name}</div>
        <span
          className={`self-start rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest ${styles.badge}`}
        >
          {styles.label}
        </span>
      </div>
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
