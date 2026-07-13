import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, Star, ExternalLink, Tag, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/lib/wallet";
import { WalletButton } from "@/components/site/WalletButton";
import { cancelListing, submitApplication } from "@/lib/marketplace.functions";
import { submitFeeTransfer } from "@/lib/marketplace-tx";
import preReveal from "@/assets/pre-reveal.jpg";

interface CollectionRow {
  id: string;
  slug: string;
  project_name: string;
  collection_name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website: string | null;
  x_account: string | null;
  telegram: string | null;
  is_official: boolean;
  verified: boolean;
  featured: boolean;
  status: string;
}

export function useCollections() {
  return useQuery({
    queryKey: ["marketplace-collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("status", "active")
        .order("is_official", { ascending: false })
        .order("featured", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CollectionRow[];
    },
  });
}

export function CollectionsDirectory() {
  const { data: collections = [], isLoading } = useCollections();

  const { data: officialStats } = useQuery({
    queryKey: ["official-collection-stats"],
    queryFn: async () => {
      const [supply, minted, active, volume] = await Promise.all([
        supabase.from("nfts").select("*", { count: "exact", head: true }),
        supabase.from("nfts").select("*", { count: "exact", head: true }).eq("status", "minted"),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("sales").select("price").eq("status", "confirmed"),
      ]);
      const holders = await supabase
        .from("nfts")
        .select("owner_wallet")
        .eq("status", "minted");
      const uniqueHolders = new Set((holders.data ?? []).map((r) => r.owner_wallet)).size;
      const totalVolume = (volume.data ?? []).reduce((sum, s) => sum + Number(s.price), 0);
      return {
        supply: supply.count ?? 0,
        minted: minted.count ?? 0,
        available: active.count ?? 0,
        holders: uniqueHolders,
        volume: totalVolume,
      };
    },
  });

  const { data: floor } = useQuery({
    queryKey: ["official-floor"],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("price")
        .eq("status", "active")
        .order("price", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data?.price ?? null;
    },
  });

  if (isLoading) {
    return <div className="mt-8 text-sm text-muted-foreground">Loading collections…</div>;
  }

  const official = collections.find((c) => c.is_official);
  const community = collections.filter((c) => !c.is_official);

  return (
    <div className="mt-8 space-y-8">
      {official && (
        <div className="overflow-hidden rounded-2xl glass-card">
          <div
            className="h-32 w-full bg-gradient-to-r from-african-gold/30 via-cyber-cyan/10 to-transparent bg-cover bg-center sm:h-44"
            style={official.banner_url ? { backgroundImage: `url(${official.banner_url})` } : undefined}
          />
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-display text-2xl">{official.collection_name}</h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-cyber-cyan/40 bg-cyber-cyan/10 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-cyber-cyan">
                <ShieldCheck size={11} /> Verified · Official
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{official.description}</p>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Supply" value={officialStats?.supply ?? "—"} />
              <Stat label="Holders" value={officialStats?.holders ?? "—"} />
              <Stat label="Floor" value={floor != null ? `${floor} XNT` : "—"} accent />
              <Stat label="Volume" value={`${(officialStats?.volume ?? 0).toFixed(2)} XNT`} />
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="label-xs mb-3">Community Collections</div>
        {community.length === 0 ? (
          <div className="rounded-2xl glass-card p-8 text-center text-sm text-muted-foreground">
            No community collections yet. Be the first to apply below.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {community.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-xl glass-card">
                <div
                  className="h-20 w-full bg-white/5 bg-cover bg-center"
                  style={c.banner_url ? { backgroundImage: `url(${c.banner_url})` } : undefined}
                />
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg">{c.collection_name}</span>
                    {c.verified && (
                      <ShieldCheck size={14} className="text-cyber-cyan" />
                    )}
                    {c.featured && <Star size={14} className="text-african-gold" />}
                  </div>
                  <div className="text-xs text-muted-foreground">by {c.project_name}</div>
                  {c.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                  )}
                  {c.website && (
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-[11px] text-cyber-cyan hover:underline"
                    >
                      Visit site <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div>
      <div className="label-xs">{label}</div>
      <div className={`mt-1 font-display text-xl ${accent ? "text-african-gold" : ""}`}>{value}</div>
    </div>
  );
}

// ─── Apply for community collection listing ────────────────────────────────

export function ApplyCollectionForm({ feeXnt, feeWallet, rpcUrl }: { feeXnt: number; feeWallet: string | null; rpcUrl: string }) {
  const { address, status, walletId, isSimulated } = useWallet();
  const [form, setForm] = useState({
    projectName: "",
    collectionName: "",
    website: "",
    xAccount: "",
    telegram: "",
    contractAddress: "",
    description: "",
    logoUrl: "",
    bannerUrl: "",
  });
  const [stage, setStage] = useState<"idle" | "signing" | "confirming" | "submitting" | "done">(
    "idle",
  );

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!address) return;
    if (isSimulated) {
      toast.error("Connect a real wallet to pay the listing fee on-chain.");
      return;
    }
    if (!feeWallet) {
      toast.error("Marketplace is not fully configured yet — try again later.");
      return;
    }
    if (!form.projectName.trim() || !form.collectionName.trim()) {
      toast.error("Project name and collection name are required");
      return;
    }
    try {
      const sig = await submitFeeTransfer({
        rpcUrl,
        fromAddress: address,
        toWallet: feeWallet,
        amountXnt: feeXnt,
        walletId,
        onStage: (s) => setStage(s),
      });
      setStage("submitting");
      const res = await submitApplication({
        data: {
          projectName: form.projectName.trim(),
          collectionName: form.collectionName.trim(),
          website: form.website.trim(),
          xAccount: form.xAccount.trim() || undefined,
          telegram: form.telegram.trim() || undefined,
          contractAddress: form.contractAddress.trim() || undefined,
          creatorWallet: address,
          description: form.description.trim() || undefined,
          logoUrl: form.logoUrl.trim(),
          bannerUrl: form.bannerUrl.trim(),
          signature: sig,
        },
      });
      setStage("done");
      if (res.alreadySubmitted) {
        toast("This payment was already used for an application");
      } else {
        toast.success("Application submitted — pending admin review");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit application");
      setStage("idle");
    }
  }

  if (stage === "done") {
    return (
      <div className="mt-8 rounded-2xl glass-card p-8 text-center">
        <ShieldCheck size={32} className="mx-auto text-cyber-cyan" />
        <h3 className="mt-3 font-display text-2xl">Application submitted</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your collection is pending admin review. Once approved, it will appear as a Verified
          collection in the directory.
        </p>
      </div>
    );
  }

  const busy = stage !== "idle";

  return (
    <div className="mt-8 max-w-2xl">
      <div className="rounded-2xl glass-card p-6">
        <h3 className="font-display text-2xl">Apply to list your collection</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          A listing fee of <span className="text-african-gold">{feeXnt} XNT</span> (≈$3 USD) is
          required to submit an application. Your collection will be reviewed by an admin before it
          appears as Verified in the marketplace directory.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Project name *" value={form.projectName} onChange={(v) => update("projectName", v)} />
          <Field label="Collection name *" value={form.collectionName} onChange={(v) => update("collectionName", v)} />
          <Field label="Website" value={form.website} onChange={(v) => update("website", v)} placeholder="https://" />
          <Field label="X (Twitter)" value={form.xAccount} onChange={(v) => update("xAccount", v)} placeholder="@handle" />
          <Field label="Telegram" value={form.telegram} onChange={(v) => update("telegram", v)} placeholder="t.me/..." />
          <Field label="Contract address" value={form.contractAddress} onChange={(v) => update("contractAddress", v)} />
          <Field label="Logo URL" value={form.logoUrl} onChange={(v) => update("logoUrl", v)} placeholder="https://" />
          <Field label="Banner URL" value={form.bannerUrl} onChange={(v) => update("bannerUrl", v)} placeholder="https://" />
        </div>
        <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-sm border border-white/15 bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-african-gold/60"
        />

        <div className="mt-3 text-xs text-muted-foreground">
          Creator wallet: <span className="font-mono">{address ?? "not connected"}</span>
        </div>

        {status !== "connected" ? (
          <div className="mt-6">
            <WalletButton />
          </div>
        ) : (
          <button
            onClick={submit}
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-foreground py-3 text-sm font-display text-background hover:bg-african-gold disabled:opacity-60 sm:w-auto sm:px-8"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {stage === "idle" && `Pay ${feeXnt} XNT & Submit`}
            {stage === "signing" && "Waiting for signature…"}
            {stage === "confirming" && "Confirming on-chain…"}
            {stage === "submitting" && "Submitting…"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-sm border border-white/15 bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-african-gold/60"
      />
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

interface OwnedNft {
  id: string;
  name: string;
  token_id: number;
  image_url: string | null;
  status: string;
}

interface MyListing {
  id: string;
  price: number;
  status: string;
  created_at: string;
  nfts: { name: string; token_id: number; image_url: string | null } | null;
}

interface MySale {
  id: string;
  price: number;
  platform_fee_amount: number;
  seller_amount: number;
  status: string;
  buyer_wallet: string;
  seller_wallet: string;
  created_at: string;
}

export function DashboardPanel({ onListNft }: { onListNft: (nft: OwnedNft) => void }) {
  const { address, status } = useWallet();

  const { data: owned = [], isLoading: loadingOwned } = useQuery({
    enabled: !!address,
    queryKey: ["my-nfts-dashboard", address],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nfts")
        .select("id, name, token_id, image_url, status")
        .eq("owner_wallet", address!)
        .eq("status", "minted")
        .order("token_id", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OwnedNft[];
    },
  });

  const { data: myListings = [], refetch: refetchListings } = useQuery({
    enabled: !!address,
    queryKey: ["my-listings", address],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*, nfts(name, token_id, image_url)")
        .eq("seller_wallet", address!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MyListing[];
    },
  });

  const { data: sales = [] } = useQuery({
    enabled: !!address,
    queryKey: ["my-sales", address],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .or(`buyer_wallet.eq.${address},seller_wallet.eq.${address}`)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MySale[];
    },
  });

  if (status !== "connected") {
    return (
      <div className="mt-10 rounded-2xl glass-card p-10 text-center">
        <WalletIcon size={28} className="mx-auto text-muted-foreground" />
        <h3 className="mt-3 font-display text-2xl">Connect your wallet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect a wallet to view your listings, purchases, sales and earnings.
        </p>
        <div className="mt-6 flex justify-center">
          <WalletButton />
        </div>
      </div>
    );
  }

  const activeListings = myListings.filter((l) => l.status === "active");
  const listableNfts = owned.filter(
    (n) => !myListings.some((l) => l.status === "active" && l.nfts?.token_id === n.token_id),
  );
  const asBuyer = sales.filter((s) => s.buyer_wallet === address);
  const asSeller = sales.filter((s) => s.seller_wallet === address);
  const earnings = asSeller.reduce((sum, s) => sum + Number(s.seller_amount), 0);

  async function cancel(listingId: string) {
    try {
      await cancelListing({ data: { walletAddress: address!, listingId } });
      toast.success("Listing cancelled");
      refetchListings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel listing");
    }
  }

  return (
    <div className="mt-8 space-y-10">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <DashStat label="Owned" value={owned.length} />
        <DashStat label="Active Listings" value={activeListings.length} />
        <DashStat label="Sold" value={asSeller.length} />
        <DashStat label="Earnings" value={`${earnings.toFixed(3)} XNT`} accent />
      </div>

      <section>
        <div className="label-xs mb-3">Your NFTs — list for sale</div>
        {loadingOwned ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : listableNfts.length === 0 ? (
          <div className="rounded-xl glass-card p-6 text-sm text-muted-foreground">
            No unlisted NFTs. Mint one on the Mint page, or check your active listings below.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {listableNfts.map((n) => (
              <button
                key={n.id}
                onClick={() => onListNft(n)}
                className="group overflow-hidden rounded-xl glass-card text-left transition hover:border-african-gold/50"
              >
                <img
                  src={n.image_url || preReveal}
                  alt={n.name}
                  className="aspect-square w-full object-cover transition group-hover:scale-105"
                />
                <div className="p-2">
                  <div className="truncate text-xs font-medium">{n.name}</div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-african-gold">
                    <Tag size={10} /> List for sale
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="label-xs mb-3">Active listings</div>
        {activeListings.length === 0 ? (
          <div className="rounded-xl glass-card p-6 text-sm text-muted-foreground">
            You have no active listings.
          </div>
        ) : (
          <div className="space-y-2">
            {activeListings.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 rounded-xl glass-card p-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={l.nfts?.image_url || preReveal}
                    alt={l.nfts?.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <div>
                    <div className="text-sm font-medium">{l.nfts?.name}</div>
                    <div className="font-display text-african-gold">{l.price} XNT</div>
                  </div>
                </div>
                <button
                  onClick={() => cancel(l.id)}
                  className="rounded-sm border border-white/15 px-3 py-1.5 text-xs hover:border-destructive/60 hover:text-destructive"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="label-xs mb-3">Activity</div>
        {sales.length === 0 ? (
          <div className="rounded-xl glass-card p-6 text-sm text-muted-foreground">
            No purchases or sales yet.
          </div>
        ) : (
          <div className="space-y-2">
            {sales.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl glass-card p-3 text-sm">
                <span className="capitalize text-muted-foreground">
                  {s.buyer_wallet === address ? "Purchased" : "Sold"}
                </span>
                <span className="font-display text-african-gold">{s.price} XNT</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      <div className="hidden">{asBuyer.length}</div>
    </div>
  );
}

function DashStat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl glass-card p-4">
      <div className="label-xs">{label}</div>
      <div className={`mt-1 font-display text-2xl ${accent ? "text-african-gold" : ""}`}>{value}</div>
    </div>
  );
}
