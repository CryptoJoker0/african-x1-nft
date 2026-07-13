import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/lib/wallet";
import { WalletButton } from "@/components/site/WalletButton";
import preReveal from "@/assets/pre-reveal.jpg";
import { ExternalLink, Tag, Search, TrendingUp, Clock } from "lucide-react";
import { WelcomeModal, ListNFTModal, BuyModal, hasEnteredMarketplace } from "@/components/marketplace/modals";
import { CollectionsDirectory, ApplyCollectionForm, DashboardPanel } from "@/components/marketplace/panels";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — AFRICAN X1 NFT" },
      {
        name: "description",
        content: "Buy and sell AFRICAN X1 NFTs on the X1 Blockchain marketplace.",
      },
      { property: "og:title", content: "AFRICAN X1 NFT Marketplace" },
      {
        property: "og:description",
        content: "Browse and acquire AFRICAN X1 NFTs from the secondary marketplace.",
      },
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
  category: string | null;
  created_at: string;
  nfts: {
    name: string;
    token_id: number;
    image_url: string | null;
    rarity: string;
  } | null;
}

type Tab = "browse" | "collections" | "apply" | "dashboard";
type SortMode = "recent" | "trending" | "price-asc" | "price-desc";

function MarketplacePage() {
  const navigate = useNavigate();
  const { status: walletStatus, address } = useWallet();
  const qc = useQueryClient();

  const [entered, setEntered] = useState(false);
  const [checkedEntry, setCheckedEntry] = useState(false);

  useEffect(() => {
    setEntered(hasEnteredMarketplace());
    setCheckedEntry(true);
  }, []);
  const [tab, setTab] = useState<Tab>("browse");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [buyTarget, setBuyTarget] = useState<Listing | null>(null);
  const [listTarget, setListTarget] = useState<{ id: string; name: string; token_id: number; image_url: string | null } | null>(null);

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("collection_config")
        .select("marketplace_enabled, mint_price, fee_wallet, treasury_wallet, listing_application_fee_xnt, rpc_url")
        .eq("id", 1)
        .single();
      return data;
    },
  });

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*, nfts(name, token_id, image_url, rarity)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Listing[];
    },
  });

  const filtered = useMemo(() => {
    let rows = listings;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (l) =>
          l.nfts?.name?.toLowerCase().includes(q) ||
          l.category?.toLowerCase().includes(q) ||
          String(l.nfts?.token_id ?? "").includes(q),
      );
    }
    const sorted = [...rows];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "trending") {
      // Rarity-weighted proxy for trending until real view-count tracking exists.
      const weight: Record<string, number> = { legendary: 5, elite: 4, rare: 3, uncommon: 2, common: 1 };
      sorted.sort((a, b) => (weight[b.nfts?.rarity ?? ""] ?? 0) - (weight[a.nfts?.rarity ?? ""] ?? 0));
    } else {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  }, [listings, search, sort]);

  const marketplaceEnabled = config?.marketplace_enabled ?? false;

  function refreshListings() {
    qc.invalidateQueries({ queryKey: ["listings"] });
    qc.invalidateQueries({ queryKey: ["my-listings"] });
    qc.invalidateQueries({ queryKey: ["my-nfts-dashboard"] });
  }

  if (!checkedEntry) {
    return null;
  }

  if (!entered) {
    return (
      <WelcomeModal
        onEnter={() => setEntered(true)}
        onCancel={() => navigate({ to: "/" })}
      />
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "browse", label: "Browse" },
    { id: "collections", label: "Collections" },
    { id: "apply", label: "Apply" },
    { id: "dashboard", label: "Dashboard" },
  ];

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
            Buy and sell AFRICAN X1 NFTs and verified community collections. All trades settle
            on-chain on the X1 Blockchain.
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
            <Link
              to="/collection"
              className="inline-flex items-center gap-2 rounded-sm border border-white/15 px-5 py-2.5 text-sm font-medium hover:border-african-gold/60 hover:text-african-gold"
            >
              Browse Collection
            </Link>
            <Link
              to="/mint"
              className="inline-flex items-center gap-2 rounded-sm bg-foreground px-5 py-2.5 text-sm font-display text-background hover:bg-african-gold"
            >
              Go to Mint
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                  tab === t.id
                    ? "border-cyber-cyan/60 bg-cyber-cyan/15 text-cyber-cyan"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "browse" && (
            <>
              {/* Search + sort */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, token #, or category…"
                    className="w-full rounded-sm border border-white/15 bg-background/40 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-african-gold/60"
                  />
                </div>
                <div className="flex gap-2">
                  {(
                    [
                      { id: "recent", label: "Recently listed", icon: <Clock size={12} /> },
                      { id: "trending", label: "Trending", icon: <TrendingUp size={12} /> },
                      { id: "price-asc", label: "Price ↑" },
                      { id: "price-desc", label: "Price ↓" },
                    ] as { id: SortMode; label: string; icon?: React.ReactNode }[]
                  ).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSort(s.id)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                        sort === s.id
                          ? "border-african-gold/60 bg-african-gold/10 text-african-gold"
                          : "border-white/10 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s.icon}
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 label-xs">
                {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
              </div>

              {/* Grid */}
              {isLoading ? (
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="mt-16 rounded-2xl glass-card p-10 text-center">
                  <Tag size={32} className="mx-auto text-muted-foreground" />
                  <div className="mt-4 font-display text-xl">No listings found</div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try a different search, or list your own NFT from the Dashboard tab.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {filtered.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      isOwn={!!address && listing.seller_wallet === address}
                      onBuy={() => setBuyTarget(listing)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "collections" && <CollectionsDirectory />}

          {tab === "apply" && (
            <ApplyCollectionForm
              feeXnt={Number(config?.listing_application_fee_xnt ?? 0.05)}
              feeWallet={config?.fee_wallet || config?.treasury_wallet || null}
              rpcUrl={config?.rpc_url || "https://rpc.mainnet.x1.xyz"}
            />
          )}

          {tab === "dashboard" && <DashboardPanel onListNft={(nft) => setListTarget(nft)} />}
        </>
      )}

      {buyTarget && (
        <BuyModal
          listing={buyTarget}
          onClose={() => setBuyTarget(null)}
          onPurchased={() => {
            setBuyTarget(null);
            refreshListings();
          }}
        />
      )}
      {listTarget && (
        <ListNFTModal
          nft={listTarget}
          onClose={() => setListTarget(null)}
          onListed={() => {
            setListTarget(null);
            refreshListings();
          }}
        />
      )}
    </div>
  );
}

function ListingCard({
  listing,
  isOwn,
  onBuy,
}: {
  listing: Listing;
  isOwn: boolean;
  onBuy: () => void;
}) {
  const nft = listing.nfts;

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
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm">{nft?.name ?? "Unknown NFT"}</span>
          {nft?.token_id != null && (
            <span className="font-mono text-xs text-muted-foreground">#{nft.token_id}</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-display text-lg text-african-gold">
            {listing.price} <span className="text-xs text-muted-foreground">XNT</span>
          </span>
          <a
            href={`https://explorer.x1.xyz/address/${listing.seller_wallet}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-cyber-cyan"
            onClick={(e) => e.stopPropagation()}
          >
            Seller <ExternalLink size={10} />
          </a>
        </div>
        <button
          onClick={onBuy}
          disabled={isOwn}
          title={isOwn ? "You own this listing" : undefined}
          className="mt-3 w-full rounded-sm border border-african-gold/40 bg-african-gold/10 py-2 text-xs font-semibold text-african-gold transition hover:bg-african-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isOwn ? "Your listing" : `Buy · ${listing.price} XNT`}
        </button>
      </div>
    </div>
  );
}
