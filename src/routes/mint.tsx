import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/lib/wallet";
import { useAuth } from "@/lib/use-auth";
import { WalletButton } from "@/components/site/WalletButton";
import { toast } from "sonner";
import { claimMint, preflightMint } from "@/lib/mint.functions";
import { submitMintTransfer } from "@/lib/mint-tx";
import logo from "@/assets/african-x1-logo.asset.json";

export const Route = createFileRoute("/mint")({
  head: () => ({
    meta: [
      { title: "Mint — AFRICAN X1 NFT" },
      { name: "description", content: "Mint your AFRICAN X1 NFT live on the X1 Blockchain." },
      { property: "og:title", content: "Mint AFRICAN X1 NFT" },
      {
        property: "og:description",
        content: "Mint your piece of the AFRICAN X1 collection on X1 Mainnet.",
      },
    ],
  }),
  component: MintPage,
});

/**
 * Mint flow stages (in order):
 *   idle → preflight → preparing → signing → confirming → claiming → success
 *                                                                  ↘ error
 */
type Stage =
  | "idle"
  | "preflight" // server validates config + availability BEFORE payment
  | "preparing" // building the X1 transaction client-side
  | "signing" // waiting for wallet signature
  | "confirming" // waiting for X1 on-chain confirmation
  | "claiming" // server verifying + assigning NFTs
  | "success"
  | "error";

function MintPage() {
  const { address, status: walletStatus, walletId, isSimulated } = useWallet();
  const { user } = useAuth();
  const claim = useServerFn(claimMint);
  const preflight = useServerFn(preflightMint);
  const [qty, setQty] = useState(1);
  const [stage, setStage] = useState<Stage>("idle");
  const [signature, setSignature] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const { data } = await supabase.from("collection_config").select("*").eq("id", 1).single();
      return data;
    },
  });
  const { data: minted = 0 } = useQuery({
    queryKey: ["minted-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("nfts")
        .select("*", { count: "exact", head: true })
        .eq("status", "minted");
      return count ?? 0;
    },
  });

  const max = config?.max_per_wallet ?? 5;
  const price = Number(config?.mint_price ?? 0);
  const total = price * qty;
  const configReady = !!config?.treasury_wallet && !!config?.rpc_url;
  const soldOut = minted >= (config?.max_supply ?? 0) && (config?.max_supply ?? 0) > 0;
  const canMint =
    walletStatus === "connected" &&
    !isSimulated &&
    !config?.mint_paused &&
    configReady &&
    !!user &&
    !soldOut;

  async function handleMint() {
    // ── Local validations (client-side, no network) ─────────────────────────
    if (!address) return toast.error("Connect your wallet first");
    if (isSimulated)
      return toast.error(
        "Simulated wallet cannot sign real transactions. Install Phantom, Backpack, or X1 Wallet.",
      );
    if (!user) return toast.error("Sign in first to mint");
    if (config?.mint_paused) return toast.error("Mint is currently paused");
    if (!configReady) return toast.error("Admin must configure treasury wallet + RPC URL");
    if (soldOut) return toast.error("Collection is sold out");

    setStage("preflight");
    setErrMsg(null);
    setSignature(null);

    try {
      // ── Step 1: Pre-flight (server validates BEFORE payment) ─────────────
      // This ensures the service role key is present, Supabase is reachable,
      // NFTs are available, and the user is whitelisted — all BEFORE any funds
      // leave the user's wallet.
      const pre = await preflight({ data: { walletAddress: address, qty } });

      // ── Step 2: Submit payment on-chain ──────────────────────────────────
      setStage("preparing");
      const sig = await submitMintTransfer({
        rpcUrl: pre.rpcUrl,
        treasury: pre.treasury,
        address,
        totalXnt: pre.mintPrice * qty,
        walletId,
        onStage: (s) => setStage(s),
      });

      // ── Step 3: Server verifies payment + atomically assigns NFTs ────────
      setStage("claiming");
      const result = await claim({ data: { signature: sig, walletAddress: address, qty } });

      setSignature(result.signature);
      setStage("success");
      toast.success(`Successfully minted ${qty} NFT${qty > 1 ? "s" : ""}!`);
    } catch (e) {
      const m = e instanceof Error ? e.message : "Mint failed";
      setErrMsg(m);
      setStage("error");
      toast.error(m);
    }
  }

  const busy = stage !== "idle" && stage !== "success" && stage !== "error";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-10 text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-african-gold">Genesis Mint</div>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">
          Forge your <span className="text-gradient-cyber">artifact</span>.
        </h1>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl glass-card animate-scan">
          <img src={logo.url} alt="Mint preview" className="aspect-square w-full object-cover" />
        </div>

        <div className="rounded-2xl glass-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Price per NFT
              </div>
              <div className="font-display text-3xl text-african-gold">
                {price} <span className="text-base text-muted-foreground">XNT</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Minted
              </div>
              <div className="font-display text-2xl">
                {minted.toLocaleString()} / {config?.max_supply?.toLocaleString() ?? "—"}
              </div>
            </div>
          </div>

          <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="mb-6">
            <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Quantity (max {max})
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="rounded-full border border-white/10 p-2 hover:bg-white/5 disabled:opacity-40"
                disabled={qty <= 1 || busy}
              >
                <Minus size={16} />
              </button>
              <div className="flex-1 rounded-xl border border-white/10 bg-background/40 py-3 text-center font-display text-3xl">
                {qty}
              </div>
              <button
                onClick={() => setQty((q) => Math.min(max, q + 1))}
                className="rounded-full border border-white/10 p-2 hover:bg-white/5 disabled:opacity-40"
                disabled={qty >= max || busy}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between rounded-xl border border-african-gold/20 bg-african-gold/5 p-4">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-display text-2xl text-african-gold">{total.toFixed(2)} XNT</span>
          </div>

          {walletStatus !== "connected" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Connect a wallet to mint.</p>
              <WalletButton />
            </div>
          ) : (
            <button
              onClick={handleMint}
              disabled={!canMint || busy}
              className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[var(--gradient-cyber)] px-6 py-3.5 font-semibold text-background animate-pulse-glow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {stage === "idle" && (
                <>
                  <Sparkles size={16} /> Mint {qty} NFT{qty > 1 ? "s" : ""}
                </>
              )}
              {stage === "preflight" && (
                <>
                  <Loader2 size={16} className="animate-spin" /> Checking availability…
                </>
              )}
              {stage === "preparing" && (
                <>
                  <Loader2 size={16} className="animate-spin" /> Preparing transaction…
                </>
              )}
              {stage === "signing" && (
                <>
                  <Loader2 size={16} className="animate-spin" /> Awaiting signature…
                </>
              )}
              {stage === "confirming" && (
                <>
                  <Loader2 size={16} className="animate-spin" /> Confirming on X1…
                </>
              )}
              {stage === "claiming" && (
                <>
                  <Loader2 size={16} className="animate-spin" /> Assigning NFT…
                </>
              )}
              {stage === "success" && (
                <>
                  <CheckCircle2 size={16} /> Minted
                </>
              )}
              {stage === "error" && (
                <>
                  <AlertTriangle size={16} /> Retry
                </>
              )}
            </button>
          )}

          {walletStatus === "connected" && (
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              {isSimulated && (
                <p className="text-african-gold">
                  Simulated wallet — install Phantom, Backpack, or X1 Wallet to mint on-chain.
                </p>
              )}
              {!user && (
                <p>
                  <Link to="/auth" className="text-cyber-cyan hover:underline">
                    Sign in
                  </Link>{" "}
                  to record your mint.
                </p>
              )}
              {!configReady && <p>Waiting for admin to configure treasury wallet + RPC URL.</p>}
              {config?.mint_paused && (
                <p className="text-destructive">Mint is currently paused by admin.</p>
              )}
              {soldOut && <p className="text-destructive">Collection is sold out.</p>}
            </div>
          )}

          {/* Progress timeline */}
          {stage !== "idle" && (
            <div className="mt-6 space-y-2">
              <Step
                label="Checking availability"
                active={stage === "preflight"}
                done={["preparing", "signing", "confirming", "claiming", "success"].includes(stage)}
              />
              <Step
                label="Preparing transaction"
                active={stage === "preparing"}
                done={["signing", "confirming", "claiming", "success"].includes(stage)}
              />
              <Step
                label="Awaiting wallet signature"
                active={stage === "signing"}
                done={["confirming", "claiming", "success"].includes(stage)}
              />
              <Step
                label="Confirming on X1 Mainnet"
                active={stage === "confirming"}
                done={["claiming", "success"].includes(stage)}
              />
              <Step
                label="Assigning your NFT"
                active={stage === "claiming"}
                done={stage === "success"}
              />
              <Step label="Mint complete" active={false} done={stage === "success"} />
            </div>
          )}

          {stage === "success" && signature && (
            <div className="mt-4 rounded-xl border border-cyber-cyan/30 bg-cyber-cyan/5 p-4">
              <div className="flex items-center gap-2 text-cyber-cyan">
                <CheckCircle2 size={16} />
                <span className="font-semibold">Mint confirmed</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Your NFT is now in your wallet.</p>
              <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-background/60 p-2 font-mono text-[11px]">
                <span className="truncate">{signature}</span>
                <a
                  href={`https://explorer.x1.xyz/tx/${signature}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-cyber-cyan hover:underline"
                >
                  Explorer <ExternalLink size={12} />
                </a>
              </div>
              <Link
                to="/dashboard"
                className="mt-3 inline-flex text-xs text-african-gold hover:underline"
              >
                View in your dashboard →
              </Link>
            </div>
          )}

          {stage === "error" && errMsg && (
            <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={16} /> {errMsg}
              </div>
              <button onClick={() => setStage("idle")} className="mt-2 text-xs underline">
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
          done
            ? "border-cyber-cyan bg-cyber-cyan text-background"
            : active
              ? "border-cyber-cyan text-cyber-cyan"
              : "border-white/15 text-muted-foreground"
        }`}
      >
        {done ? (
          <CheckCircle2 size={12} />
        ) : active ? (
          <Loader2 size={10} className="animate-spin" />
        ) : (
          "·"
        )}
      </span>
      <span
        className={done ? "text-foreground" : active ? "text-cyber-cyan" : "text-muted-foreground"}
      >
        {label}
      </span>
    </div>
  );
}
