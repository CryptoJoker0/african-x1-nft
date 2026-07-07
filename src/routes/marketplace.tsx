import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/lib/wallet";
import { WalletButton } from "@/components/site/WalletButton";
import preReveal from "@/assets/pre-reveal.jpg";
import { ExternalLink, Tag } from "lucide-react";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — AFRICAN X1 NFT" },
      { name: "description", content: "Buy and sell AFRICAN X1 NFTs on the X1 Blockchain marketplace." },
      { property: "og:title", content: "AFRICAN X1 NFT Marketplace" },
      { property: "og:description", content: "Browse and acquire AFRICAN X1 NFTs from the secondary marketplace." },
    ],
  }),
  component: MarketplacePage,
});

interface Listing {
  id: string;
  nft_id: string;
  price: number;
  seller_wallet: string;
  status: string;
  created_at: string;
  nfts: {
    name: string;
    token_id: number;
    image_url: string | null;
    rarity: string;
  } | null;
}

function MarketplacePage() {
  const { status: walletStatus } = useWallet();
  const [filter, setFilter] = useState<"all" | "active">("active");

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("collection_config")
        .select("marketplace_enabled, mint_price")
        .eq("id", 1)
        .single();
      return data;
    },
  });

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings", filter],
    queryFn: async () => {
      let q = supabase
        .from("listings")
        .select("*, nfts(name, token_id, image_url, rarity)")
        .order("created_at", { ascending: false });
      if (filter === "active") q = q.eq("status", "active");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Listing[];
    },
  });

  const marketplaceEnabled = config?.marketplace_enabled ?? false;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 sm:px-10">
      {/* Masthead */}
      <div className="grid grid-cols-12 items-end gap-6 border-b border-white/10 pb-8">
        <div className="col-span-12 md:col-span-8">
          <div className="eyebrow">Secondary Market · X1 Chain</div>
          <h1 className="mt-3 font-display text-5xl leading-none sm:text-6xl">
            The <span className="serif-italic text-gradient-gold">Exchange</span>.
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            Browse and acquire AFRICAN X1 NFTs from other holders. All trades settle on-chain on the X1 Blockchain with creator royalties enforced.
          </p>
        </div>
        <div className="col-span-12 md:col-span-4 flex justify-end">
          {walletStatus !== "connected" && <WalletButton />}
        </div>
      </div>

      {!marketplaceEnabled ? (
        <div className="mt-20 text-center">
          <div className="folio text-[120px] text-african-gold/20">∅</div>
          <h2 className="mt-4 font-display text-3xl">Marketplace not yet open</h2>
          <p className="mt-3 max-w-md mx-auto text-sm text-muted-foreground">
            The secondary marketplace will open after the genesis mint is complete. Check back soon.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/collection" className="inline-flex items-center gap-2 rounded-sm border border-white/15 px-5 py-2.5 text-sm font-medium hover:border-african-gold/60 hover:text-african-gold">
              Browse Collection
            </Link>
            <Link to="/mint" className="inline-flex items-center gap-2 rounded-sm bg-foreground px-5 py-2.5 text-sm font-display text-background hover:bg-african-gold">
              Go to Mint
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="mt-8 flex items-center gap-3">
            <span className="label-xs">Show</span>
            {(["active", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium capitalize transition ${
                  filter === f
                    ? "border-cyber-cyan/60 bg-cyber-cyan/15 text-cyber-cyan"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "active" ? "Active listings" : "All listings"}
              </button>
            ))}
            <span className="ml-auto label-xs">{listings.length} listing{listings.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="mt-16 rounded-2xl glass-card p-10 text-center">
              <Tag size={32} className="mx-auto text-muted-foreground" />
              <div className="mt-4 font-display text-xl">No listings found</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {filter === "active"
                  ? "No active listings at the moment. Check back soon."
                  : "No listings have been created yet."}
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const nft = listing.nfts;
  const isActive = listing.status === "active";

  return (
    <div className="group relative overflow-hidden rounded-2xl glass-card text-left transition hover:border-african-gold/50">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={nft?.image_url || preReveal}
          alt={nft?.name ?? "NFT"}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {nft?.rarity && (
          <span className="absolute left-3 top-3 rounded-full border border-african-gold/50 bg-african-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-african-gold">
            {nft.rarity}
          </span>
        )}
        {!isActive && (
          <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-background/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground capitalize">
            {listing.status}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm">{nft?.name ?? "Unknown NFT"}</span>
          {nft?.token_id != null && (
            <span className="font-mono text-xs text-muted-foreground">#{nft.token_id}</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-display text-lg text-african-gold">{listing.price} <span className="text-xs text-muted-foreground">XNT</span></span>
          {isActive && (
            <a
              href={`https://explorer.x1.xyz/address/${listing.seller_wallet}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-cyber-cyan"
              onClick={(e) => e.stopPropagation()}
            >
              Seller <ExternalLink size={10} />
            </a>
          )}
        </div>
        {isActive && (
          <button
            disabled
            title="On-chain purchase coming soon"
            className="mt-3 w-full rounded-sm border border-african-gold/30 bg-african-gold/5 py-2 text-xs font-semibold text-african-gold opacity-60 cursor-not-allowed"
          >
            Buy · {listing.price} XNT
          </button>
        )}
      </div>
    </div>
  );
}
