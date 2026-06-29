import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import preReveal from "@/assets/pre-reveal.jpg";

export const Route = createFileRoute("/collection")({
  head: () => ({
    meta: [
      { title: "Collection — AFRICAN X1 NFT" },
      { name: "description", content: "Browse all 50 AFRICAN X1 NFTs. Filter by status, rarity and traits." },
      { property: "og:title", content: "AFRICAN X1 NFT Collection" },
      { property: "og:description", content: "Explore the full AFRICAN X1 NFT collection on the X1 Blockchain." },
    ],
  }),
  component: CollectionPage,
});

type Status = "all" | "available" | "minted" | "owned";
type Rarity = "all" | "legendary" | "elite" | "rare" | "uncommon" | "common";

interface NFT {
  id: string;
  token_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  rarity: Rarity;
  status: "available" | "minted" | "reserved";
  owner_wallet: string | null;
  traits: Record<string, string>;
}

const RARITY_COLOR: Record<string, string> = {
  legendary: "text-rarity-legendary border-rarity-legendary/50 bg-rarity-legendary/10",
  elite: "text-rarity-elite border-rarity-elite/50 bg-rarity-elite/10",
  rare: "text-rarity-rare border-rarity-rare/50 bg-rarity-rare/10",
  uncommon: "text-rarity-uncommon border-rarity-uncommon/50 bg-rarity-uncommon/10",
  common: "text-rarity-common border-rarity-common/50 bg-rarity-common/10",
};

function CollectionPage() {
  const [status, setStatus] = useState<Status>("all");
  const [rarity, setRarity] = useState<Rarity>("all");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<NFT | null>(null);

  const { data: nfts = [], isLoading } = useQuery({
    queryKey: ["nfts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nfts").select("*").order("token_id", { ascending: true }).limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as NFT[];
    },
  });

  const filtered = useMemo(() => {
    return nfts.filter((n) => {
      if (status !== "all" && status !== "owned" && n.status !== status) return false;
      if (rarity !== "all" && n.rarity !== rarity) return false;
      if (search && !`${n.name} ${n.token_id}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [nfts, status, rarity, search]);

  const rarityCounts = useMemo(() => {
    const c: Record<string, number> = {};
    nfts.forEach((n) => { c[n.rarity] = (c[n.rarity] ?? 0) + 1; });
    return c;
  }, [nfts]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.3em] text-african-gold">Genesis Collection</div>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">Browse the <span className="text-gradient-cyber">tribe</span>.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {nfts.length.toLocaleString()} indexed · {filtered.length.toLocaleString()} match your filters.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or #ID"
            className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-cyber-cyan/60 focus:outline-none focus:ring-2 focus:ring-cyber-cyan/30"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["all","available","minted","owned"] as Status[]).map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{s}</Chip>
          ))}
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mr-1">Rarity</span>
        {(["all","legendary","elite","rare","uncommon","common"] as Rarity[]).map((r) => (
          <Chip key={r} active={rarity === r} onClick={() => setRarity(r)} color={r}>
            {r}{r !== "all" && rarityCounts[r] ? ` · ${rarityCounts[r]}` : ""}
          </Chip>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => setActive(n)}
              className="group relative overflow-hidden rounded-2xl glass-card text-left transition hover:border-cyber-cyan/50 hover:glow-blue"
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={n.image_url || preReveal}
                  alt={n.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <span className={`absolute left-3 top-3 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${RARITY_COLOR[n.rarity]}`}>
                  {n.rarity}
                </span>
                {n.status === "minted" && (
                  <span className="absolute right-3 top-3 rounded-full border border-cyber-cyan/40 bg-cyber-cyan/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-cyber-cyan">
                    minted
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm">{n.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">#{n.token_id}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {active && <NFTModal nft={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function Chip({ children, active, onClick, color }: { children: React.ReactNode; active?: boolean; onClick?: () => void; color?: string }) {
  const colorCls = color && color !== "all" && active ? RARITY_COLOR[color] : "";
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
        active
          ? colorCls || "border-cyber-cyan/60 bg-cyber-cyan/15 text-cyber-cyan"
          : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
      }`}
    >{children}</button>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl glass-card p-10 text-center">
      <div className="font-display text-lg">No NFTs to show yet</div>
      <p className="mt-2 text-sm text-muted-foreground">
        The collection will populate as the admin uploads metadata and the genesis mint begins.
      </p>
    </div>
  );
}

function NFTModal({ nft, onClose }: { nft: NFT; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="relative grid w-full max-w-3xl gap-0 overflow-hidden rounded-2xl glass-card md:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-full bg-background/60 p-1.5 hover:bg-background">
          <X size={18} />
        </button>
        <div className="relative aspect-square">
          <img src={nft.image_url || preReveal} alt={nft.name} className="h-full w-full object-cover" />
        </div>
        <div className="p-6">
          <div className="text-xs font-mono text-muted-foreground">#{nft.token_id}</div>
          <h3 className="mt-1 font-display text-2xl">{nft.name}</h3>
          <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${RARITY_COLOR[nft.rarity]}`}>
            {nft.rarity}
          </span>
          {nft.description && <p className="mt-4 text-sm text-muted-foreground">{nft.description}</p>}
          <div className="mt-6">
            <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-african-gold">Traits</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(nft.traits || {}).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">{k}</div>
                  <div className="text-sm">{v}</div>
                </div>
              ))}
              {Object.keys(nft.traits || {}).length === 0 && (
                <div className="col-span-2 text-xs text-muted-foreground">No trait metadata uploaded yet.</div>
              )}
            </div>
          </div>
          <div className="mt-6 border-t border-white/5 pt-4 text-xs text-muted-foreground">
            <div>Status: <span className="text-foreground capitalize">{nft.status}</span></div>
            {nft.owner_wallet && (
              <div className="mt-1 truncate">Owner: <span className="font-mono text-foreground">{nft.owner_wallet}</span></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
