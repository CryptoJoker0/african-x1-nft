import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Shield, Layers, Globe2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WalletButton } from "@/components/site/WalletButton";
import logo from "@/assets/african-x1-logo.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AFRICAN X1 NFT — Mint the Spirit of Africa on X1 Chain" },
      { name: "description", content: "A 50-piece NFT collection inspired by African heritage, minted natively on the X1 Blockchain. Connect your wallet, mint, and join the tribe." },
      { property: "og:title", content: "AFRICAN X1 NFT" },
      { property: "og:description", content: "Premium NFTs on X1 — spirit, mythology and futurism of Africa, on-chain." },
    ],
  }),
  component: HomePage,
});

interface Config {
  collection_name: string;
  max_supply: number;
  mint_price: number;
  mint_paused: boolean;
  whitelist_only: boolean;
  revealed: boolean;
}

function HomePage() {
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const { data } = await supabase.from("collection_config").select("*").eq("id", 1).single();
      return data as Config | null;
    },
  });
  const { data: minted = 0 } = useQuery({
    queryKey: ["minted-count"],
    queryFn: async () => {
      const { count } = await supabase.from("nfts").select("*", { count: "exact", head: true }).eq("status", "minted");
      return count ?? 0;
    },
  });

  const maxSupply = config?.max_supply ?? 50;
  const remaining = Math.max(0, maxSupply - minted);
  const progress = maxSupply > 0 ? (minted / maxSupply) * 100 : 0;
  const status = config?.mint_paused ? "PAUSED" : config?.whitelist_only ? "WHITELIST" : "LIVE";

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-20 pt-12 sm:px-6 md:grid-cols-2 md:pt-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-african-gold/30 bg-african-gold/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-african-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-african-gold animate-pulse" />
              Phase I · Genesis Mint
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              The spirit of <br />
              <span className="shimmer-gold">AFRICA</span>{" "}
              <span className="text-gradient-cyber">on-chain.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base text-muted-foreground sm:text-lg">
              50 unique digital artifacts inspired by African mythology, tribes and futurism — minted natively on the <span className="text-cyber-cyan">X1 Blockchain</span>.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/mint"
                className="group inline-flex items-center gap-2 rounded-full bg-[var(--gradient-cyber)] px-6 py-3 text-sm font-semibold text-background animate-pulse-glow"
              >
                Mint now <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </Link>
              <WalletButton />
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/5 pt-6 text-sm">
              {[
                { label: "Supply", value: maxSupply.toLocaleString() },
                { label: "Price", value: `${config?.mint_price ?? "—"} X1` },
                { label: "Chain", value: "X1 Mainnet" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.label}</div>
                  <div className="mt-1 font-display text-lg text-foreground">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-0 -z-10 animate-pulse-glow rounded-[2rem]" />
            <div className="relative aspect-square overflow-hidden rounded-[2rem] glass-card animate-scan p-4">
              <div className="relative h-full w-full overflow-hidden rounded-2xl">
                <img
                  src={logo.url}
                  alt="African X1 NFT genesis artwork"
                  width={768} height={768}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-cyber-cyan">Token #0001</div>
                    <div className="font-display text-lg text-foreground">Genesis Mask</div>
                  </div>
                  <span className="rounded-full border border-african-gold/50 bg-african-gold/15 px-2.5 py-1 text-[10px] uppercase tracking-widest text-african-gold">Legendary</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LIVE STATUS */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-2xl glass-card p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <StatusDot status={status} />
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Mint status</div>
                  <div className="font-display text-2xl">{status}</div>
                </div>
              </div>
              <Counter label="Minted" value={minted} />
              <Counter label="Remaining" value={remaining} accent />
              <Counter label="Holders" value="—" muted />
            </div>
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{minted.toLocaleString()} / {maxSupply.toLocaleString()}</span>
                <span>{progress.toFixed(2)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-[var(--gradient-cyber)] transition-all"
                  style={{ width: `${Math.max(progress, 0.5)}%`, boxShadow: "0 0 12px rgba(0,229,255,0.6)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STORY */}
      <section id="story" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <SectionLabel>Collection Story</SectionLabel>
        <h2 className="mt-3 max-w-3xl font-display text-3xl sm:text-4xl">
          Where ancestral memory meets the <span className="text-gradient-cyber">on-chain frontier</span>.
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Every AFRICAN X1 NFT is generated from 250+ hand-illustrated traits across tribes, regions, masks and totem creatures. Provenance is verifiable on-chain. Royalties flow back to creators across the continent.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: Sparkles, t: "Hand-Crafted", d: "250+ original traits illustrated by African artists." },
            { Icon: Shield, t: "Verifiable", d: "Provenance hash committed on-chain pre-mint." },
            { Icon: Layers, t: "Rarity Tiers", d: "Legendary, Elite, Rare, Uncommon, Common." },
            { Icon: Globe2, t: "X1 Native", d: "Fast, low-fee minting on X1 Mainnet." },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="glass-card rounded-2xl p-5">
              <Icon className="mb-4 text-cyber-cyan" />
              <div className="font-display text-lg">{t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROADMAP */}
      <section id="roadmap" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <SectionLabel>Roadmap</SectionLabel>
        <h2 className="mt-3 max-w-3xl font-display text-3xl sm:text-4xl">From genesis to a continental web3 ecosystem.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {ROADMAP.map((r, i) => (
            <div key={r.title} className="glass-card relative overflow-hidden rounded-2xl p-6">
              <span className="absolute right-4 top-4 font-display text-5xl font-bold text-white/[0.04]">0{i + 1}</span>
              <div className={`mb-3 inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                r.status === "done" ? "bg-cyber-cyan/15 text-cyber-cyan" :
                r.status === "active" ? "bg-african-gold/15 text-african-gold" :
                "bg-white/5 text-muted-foreground"
              }`}>{r.phase}</div>
              <div className="font-display text-lg">{r.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
        <SectionLabel>FAQ</SectionLabel>
        <h2 className="mt-3 font-display text-3xl sm:text-4xl">Frequently asked.</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((q) => <FaqItem key={q.q} q={q.q} a={q.a} />)}
        </div>
      </section>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "LIVE" ? "bg-cyber-cyan" : status === "WHITELIST" ? "bg-african-gold" : "bg-destructive";
  return (
    <span className={`relative inline-flex h-3 w-3 ${status === "LIVE" ? "animate-pulse" : ""}`}>
      <span className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-40 ${status !== "PAUSED" ? "animate-ping" : ""}`} />
      <span className={`relative h-3 w-3 rounded-full ${color}`} />
    </span>
  );
}

function Counter({ label, value, accent, muted }: { label: string; value: number | string; accent?: boolean; muted?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl ${accent ? "text-african-gold" : muted ? "text-muted-foreground" : "text-cyber-cyan"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.3em] text-african-gold">{children}</div>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className="w-full rounded-xl glass-card p-5 text-left transition hover:border-cyber-cyan/30"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium">{q}</span>
        <ChevronDown size={18} className={`shrink-0 text-cyber-cyan transition ${open ? "rotate-180" : ""}`} />
      </div>
      {open && <p className="mt-3 text-sm text-muted-foreground">{a}</p>}
    </button>
  );
}

const ROADMAP = [
  { phase: "Phase 01", status: "done", title: "Genesis Reveal", desc: "Art & lore drop. Whitelist opens for early supporters and creators." },
  { phase: "Phase 02", status: "active", title: "Public Mint", desc: "50 NFTs live on X1 Mainnet. Random assignment, verifiable provenance." },
  { phase: "Phase 03", status: "upcoming", title: "Holder Utility", desc: "Token-gated drops, staking and IRL events across African capitals." },
  { phase: "Phase 04", status: "upcoming", title: "Creator DAO", desc: "Treasury funds African digital artists. Holders vote on grants." },
] as const;

const FAQ = [
  { q: "What is AFRICAN X1 NFT?", a: "A 50-piece NFT collection minted natively on the X1 Blockchain that celebrates African culture, mythology and futurism." },
  { q: "How do I mint?", a: "Connect a Solana-compatible wallet (Phantom, Backpack, OKX) on X1, head to the Mint page, and approve the transaction." },
  { q: "What is the mint price?", a: "The current mint price is shown in the live status panel above. Whitelisted wallets may receive a discount." },
  { q: "How is rarity assigned?", a: "Traits are generated from 250+ hand-illustrated assets. Rarity ranks are calculated on reveal." },
  { q: "Are royalties enforced?", a: "Yes. A creator royalty is built into the on-chain metadata and supported by all major X1 marketplaces." },
];
