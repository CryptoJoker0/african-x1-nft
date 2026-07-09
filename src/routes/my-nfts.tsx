import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ExternalLink, Wallet } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { WalletButton } from "@/components/site/WalletButton";
import { supabase } from "@/integrations/supabase/client";
import preReveal from "@/assets/pre-reveal.jpg";

interface OwnedNFT {
  id: string;
  token_id: number;
  name: string;
  image_url: string | null;
  mint_signature: string | null;
  minted_at: string | null;
}

export const Route = createFileRoute("/my-nfts")({
  head: () => ({
    meta: [
      { title: "My NFTs — AFRICAN X1" },
      {
        name: "description",
        content: "View the AFRICAN X1 NFTs held in your connected wallet.",
      },
    ],
  }),
  component: MyNFTsPage,
});

function MyNFTsPage() {
  const { address, status: walletStatus } = useWallet();

  const { data: owned = [], isLoading } = useQuery({
    enabled: !!address,
    queryKey: ["my-nfts", address],
    queryFn: async () => {
      const { data } = await supabase
        .from("nfts")
        .select("id, token_id, name, image_url, mint_signature, minted_at")
        .eq("owner_wallet", address!)
        .eq("status", "minted")
        .order("token_id", { ascending: true });
      return (data ?? []) as OwnedNFT[];
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-10 text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-african-gold">Your collection</div>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">
          My <span className="text-gradient-cyber">NFTs</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Connect your wallet to see the AFRICAN X1 tokens you hold.
        </p>
      </header>

      {walletStatus !== "connected" ? (
        /* ── Not connected ── */
        <div className="flex flex-col items-center gap-6 rounded-2xl glass-card p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
            <Wallet size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-display text-xl">Connect your wallet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your NFTs are linked to your wallet address — no sign-in needed.
            </p>
          </div>
          <WalletButton />
        </div>
      ) : isLoading ? (
        /* ── Loading ── */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        </div>
      ) : owned.length === 0 ? (
        /* ── Empty ── */
        <div className="flex flex-col items-center gap-6 rounded-2xl glass-card p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
            <Sparkles size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-display text-xl">No NFTs yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This wallet doesn't hold any AFRICAN X1 NFTs.
            </p>
          </div>
          <Link
            to="/mint"
            className="inline-flex rounded-full bg-cyber-cyan px-5 py-2.5 text-sm font-semibold text-background hover:brightness-110"
          >
            Mint your first
          </Link>
        </div>
      ) : (
        /* ── NFT grid ── */
        <>
          <p className="mb-6 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{owned.length}</span>{" "}
            NFT{owned.length !== 1 ? "s" : ""} held by{" "}
            <span className="font-mono">{address!.slice(0, 6)}…{address!.slice(-4)}</span>
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {owned.map((n) => (
              <div key={n.id} className="overflow-hidden rounded-2xl glass-card group">
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={n.image_url ?? preReveal}
                    alt={n.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm">{n.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">#{n.token_id}</span>
                  </div>
                  {n.minted_at && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Minted {new Date(n.minted_at).toLocaleDateString()}
                    </p>
                  )}
                  {n.mint_signature && (
                    <a
                      href={`https://explorer.x1.xyz/tx/${n.mint_signature}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[10px] text-cyber-cyan hover:underline"
                    >
                      View on X1 Explorer <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
