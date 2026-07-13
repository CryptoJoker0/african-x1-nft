import { useEffect, useState } from "react";
import { X, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/lib/wallet";
import { WalletButton } from "@/components/site/WalletButton";
import { createListing, preflightPurchase, claimPurchase } from "@/lib/marketplace.functions";
import { submitPurchaseTransfer } from "@/lib/marketplace-tx";
import preReveal from "@/assets/pre-reveal.jpg";

const WELCOME_KEY = "afrx1.marketplace.entered";

export function hasEnteredMarketplace(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(WELCOME_KEY) === "1";
}

export function WelcomeModal({ onEnter, onCancel }: { onEnter: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl glass-card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-african-gold/40 bg-african-gold/10">
          <ShieldCheck className="text-african-gold" size={26} />
        </div>
        <div className="mt-5 text-[10px] uppercase tracking-[0.35em] text-african-gold">
          AFRICAN X1
        </div>
        <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
          Welcome to <span className="serif-italic text-gradient-gold">Africa NFT Marketplace</span>
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          You&apos;re entering the secondary marketplace for AFRICAN X1 NFTs and verified community
          collections on the X1 Blockchain. Trades settle on-chain — always verify collection and
          wallet addresses before buying or selling.
        </p>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={onCancel}
            className="rounded-sm border border-white/15 px-6 py-2.5 text-sm font-medium hover:border-white/30"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem(WELCOME_KEY, "1");
              onEnter();
            }}
            className="rounded-sm bg-foreground px-6 py-2.5 text-sm font-display text-background hover:bg-african-gold"
          >
            Enter Marketplace
          </button>
        </div>
      </div>
    </div>
  );
}

interface OwnedNft {
  id: string;
  name: string;
  token_id: number;
  image_url: string | null;
}

export function ListNFTModal({
  nft,
  onClose,
  onListed,
}: {
  nft: OwnedNft;
  onClose: () => void;
  onListed: () => void;
}) {
  const { address } = useWallet();
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!address) return;
    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) {
      toast.error("Enter a valid price greater than zero");
      return;
    }
    setSubmitting(true);
    try {
      await createListing({
        data: {
          walletAddress: address,
          nftId: nft.id,
          price: priceNum,
          category: category || undefined,
          description: description || undefined,
        },
      });
      toast.success("NFT listed for sale");
      onListed();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to list NFT");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose} title="List NFT for sale">
      <div className="flex gap-4">
        <img
          src={nft.image_url || preReveal}
          alt={nft.name}
          className="h-24 w-24 shrink-0 rounded-lg object-cover"
        />
        <div>
          <div className="font-display text-lg">{nft.name}</div>
          <div className="font-mono text-xs text-muted-foreground">#{nft.token_id}</div>
        </div>
      </div>

      <label className="mt-5 block text-xs uppercase tracking-widest text-muted-foreground">
        Price (XNT)
      </label>
      <input
        type="number"
        min="0"
        step="0.001"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="e.g. 2.5"
        className="mt-2 w-full rounded-sm border border-white/15 bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-african-gold/60"
      />

      <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">
        Category (optional)
      </label>
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="e.g. Legendary, Art, Collectible"
        className="mt-2 w-full rounded-sm border border-white/15 bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-african-gold/60"
      />

      <label className="mt-4 block text-xs uppercase tracking-widest text-muted-foreground">
        Description (optional)
      </label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="mt-2 w-full rounded-sm border border-white/15 bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-african-gold/60"
      />

      <button
        onClick={submit}
        disabled={submitting}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-foreground py-3 text-sm font-display text-background hover:bg-african-gold disabled:opacity-60"
      >
        {submitting && <Loader2 size={14} className="animate-spin" />}
        {submitting ? "Listing…" : "List for sale"}
      </button>
    </ModalShell>
  );
}

interface BuyListing {
  id: string;
  price: number;
  seller_wallet: string;
  nfts: { name: string; token_id: number; image_url: string | null } | null;
}

export function BuyModal({
  listing,
  onClose,
  onPurchased,
}: {
  listing: BuyListing;
  onClose: () => void;
  onPurchased: () => void;
}) {
  const { address, status, walletId, isSimulated } = useWallet();
  const [stage, setStage] = useState<"review" | "signing" | "confirming" | "claiming" | "done">(
    "review",
  );
  const [preflight, setPreflight] = useState<{
    platformFee: number;
    total: number;
    sellerAmount: number;
    feeWallet: string;
    rpcUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPreflight, setLoadingPreflight] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!address) return;
    preflightPurchase({ data: { listingId: listing.id, buyerWallet: address } })
      .then((res) => {
        if (cancelled) return;
        setPreflight(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load purchase details");
      })
      .finally(() => !cancelled && setLoadingPreflight(false));
    return () => {
      cancelled = true;
    };
  }, [address, listing.id]);

  async function buy() {
    if (!address || !preflight) return;
    if (isSimulated) {
      toast.error("Connect a real wallet (Phantom, Backpack, or X1 Web) to complete an on-chain purchase.");
      return;
    }
    setError(null);
    try {
      const sig = await submitPurchaseTransfer({
        rpcUrl: preflight.rpcUrl,
        buyerAddress: address,
        sellerWallet: listing.seller_wallet,
        sellerAmount: preflight.sellerAmount,
        feeWallet: preflight.feeWallet,
        platformFee: preflight.platformFee,
        walletId,
        onStage: (s) => setStage(s),
      });
      setStage("claiming");
      await claimPurchase({ data: { listingId: listing.id, buyerWallet: address, signature: sig } });
      setStage("done");
      toast.success("Purchase confirmed — NFT transferred to your wallet");
      onPurchased();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase failed");
      setStage("review");
    }
  }

  const nft = listing.nfts;
  const busy = stage !== "review" && stage !== "done";

  return (
    <ModalShell onClose={onClose} title="Confirm purchase">
      <div className="flex gap-4">
        <img
          src={nft?.image_url || preReveal}
          alt={nft?.name ?? "NFT"}
          className="h-24 w-24 shrink-0 rounded-lg object-cover"
        />
        <div>
          <div className="font-display text-lg">{nft?.name ?? "NFT"}</div>
          {nft?.token_id != null && (
            <div className="font-mono text-xs text-muted-foreground">#{nft.token_id}</div>
          )}
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            Seller: {listing.seller_wallet.slice(0, 4)}…{listing.seller_wallet.slice(-4)}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2 rounded-lg border border-white/10 bg-background/40 p-4 text-sm">
        <Row label="Price" value={`${listing.price} XNT`} />
        {loadingPreflight ? (
          <div className="text-xs text-muted-foreground">Loading fee breakdown…</div>
        ) : preflight ? (
          <>
            <Row label="Marketplace fee (3%)" value={`${preflight.platformFee} XNT`} muted />
            <div className="border-t border-white/10 pt-2">
              <Row label="Total" value={`${preflight.total} XNT`} bold />
            </div>
          </>
        ) : null}
      </div>

      {error && (
        <div className="mt-4 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {status !== "connected" ? (
        <div className="mt-6">
          <WalletButton />
        </div>
      ) : (
        <button
          onClick={buy}
          disabled={busy || !preflight || stage === "done"}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-foreground py-3 text-sm font-display text-background hover:bg-african-gold disabled:opacity-60"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {stage === "review" && "Confirm & Pay"}
          {stage === "signing" && "Waiting for signature…"}
          {stage === "confirming" && "Confirming on-chain…"}
          {stage === "claiming" && "Finalizing…"}
          {stage === "done" && "Purchase complete"}
        </button>
      )}
    </ModalShell>
  );
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-xs text-muted-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "font-display text-lg text-african-gold" : "font-mono"}>{value}</span>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-background/70 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl glass-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-white/5">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
