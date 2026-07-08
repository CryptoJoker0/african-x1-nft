import { useEffect, useState } from "react";
import { Wallet, LogOut, Copy, Check, ExternalLink } from "lucide-react";
import { useWallet, WALLET_OPTIONS, type WalletId } from "@/lib/wallet";
import { toast } from "sonner";

export function WalletButton({ compact = false }: { compact?: boolean }) {
  const { address, status, connect, disconnect, shortAddress, isSimulated, walletId } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Close picker on Escape
  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPickerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen]);

  async function pick(id: WalletId) {
    try {
      await connect(id);
      setPickerOpen(false);
      toast.success(`${WALLET_OPTIONS.find((o) => o.id === id)?.name} connected`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to connect");
    }
  }

  if (status === "connected" && address) {
    const active = WALLET_OPTIONS.find((o) => o.id === walletId);
    return (
      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="group flex items-center gap-2 rounded-full border border-cyber-cyan/30 bg-cyber-cyan/5 px-3 py-2 text-sm font-medium text-cyber-cyan transition hover:bg-cyber-cyan/10 hover:glow-blue"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyber-cyan opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyber-cyan" />
          </span>
          <span className="font-mono">{shortAddress}</span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl glass-card p-3 text-sm">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span>{active?.name ?? "Wallet"}</span>
              {isSimulated && (
                <span className="rounded-full bg-african-gold/15 px-2 py-0.5 text-african-gold">
                  simulated
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg bg-background/60 p-2 font-mono text-[11px] break-all">
              <span>{address}</span>
              <button
                aria-label="Copy address"
                onClick={() => {
                  navigator.clipboard.writeText(address);
                  setCopied(true);
                  toast.success("Address copied");
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="shrink-0 rounded p-1 hover:bg-white/5"
              >
                {copied ? <Check size={14} className="text-cyber-cyan" /> : <Copy size={14} />}
              </button>
            </div>
            <button
              onClick={async () => {
                await disconnect();
                setMenuOpen(false);
                toast("Wallet disconnected");
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive hover:bg-destructive/20"
            >
              <LogOut size={14} /> Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setPickerOpen(true)}
        disabled={status === "connecting"}
        className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[var(--gradient-cyber)] px-4 py-2 text-sm font-semibold text-yellow-400 transition disabled:opacity-60"
        style={{ boxShadow: "var(--shadow-glow-blue)" }}
      >
        <Wallet size={16} />
        {compact ? "Connect" : status === "connecting" ? "Connecting…" : "Connect Wallet"}
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      </button>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 p-4 backdrop-blur-md"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl glass-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-african-gold">
              Connect
            </div>
            <h2 className="font-display text-2xl">Choose your wallet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              AFRICAN X1 NFT runs on X1 Mainnet. Pick a wallet to continue.
            </p>

            <div className="mt-5 space-y-2">
              {WALLET_OPTIONS.map((opt) => {
                const detected = !!opt.detect();
                return (
                  <button
                    key={opt.id}
                    onClick={() => pick(opt.id)}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-background/40 p-4 text-left transition hover:border-cyber-cyan/40 hover:bg-cyber-cyan/5"
                  >
                    <div className="flex items-center gap-3">
                      <WalletGlyph id={opt.id} />
                      <div>
                        <div className="font-semibold">{opt.name}</div>
                        <div className="text-xs text-muted-foreground">{opt.tagline}</div>
                      </div>
                    </div>
                    {detected ? (
                      <span className="rounded-full bg-cyber-cyan/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-cyber-cyan">
                        Detected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                        Install <ExternalLink size={10} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPickerOpen(false)}
              className="mt-5 w-full rounded-lg border border-white/10 px-3 py-2 text-xs text-muted-foreground hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function WalletGlyph({ id }: { id: WalletId }) {
  const styles: Record<WalletId, string> = {
    phantom: "from-[#ab9ff2] to-[#5347d9]",
    backpack: "from-[#e33e7f] to-[#fb5d1f]",
    x1web: "from-cyber-cyan to-african-gold",
  };
  const letter = id === "phantom" ? "P" : id === "backpack" ? "B" : "X";
  return (
    <span
      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${styles[id]} font-display text-lg text-background`}
    >
      {letter}
    </span>
  );
}
