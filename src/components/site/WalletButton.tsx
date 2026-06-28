import { useState } from "react";
import { Wallet, LogOut, Copy, Check } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { toast } from "sonner";

export function WalletButton({ compact = false }: { compact?: boolean }) {
  const { address, status, connect, disconnect, shortAddress, isSimulated } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (status === "connected" && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="group flex items-center gap-2 rounded-full border border-cyber-cyan/30 bg-cyber-cyan/5 px-3 py-2 text-sm font-medium text-cyber-cyan transition hover:bg-cyber-cyan/10 hover:glow-blue"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyber-cyan opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyber-cyan" />
          </span>
          <span className="font-mono">{shortAddress}</span>
        </button>
        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl glass-card p-3 text-sm">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span>Wallet</span>
              {isSimulated && <span className="rounded-full bg-african-gold/15 px-2 py-0.5 text-african-gold">simulated</span>}
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg bg-background/60 p-2 font-mono text-[11px] break-all">
              <span>{address}</span>
              <button
                aria-label="Copy address"
                onClick={() => {
                  navigator.clipboard.writeText(address);
                  setCopied(true); toast.success("Address copied");
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="shrink-0 rounded p-1 hover:bg-white/5"
              >
                {copied ? <Check size={14} className="text-cyber-cyan" /> : <Copy size={14} />}
              </button>
            </div>
            <button
              onClick={async () => { await disconnect(); setOpen(false); toast("Wallet disconnected"); }}
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
    <button
      onClick={async () => {
        try { await connect(); toast.success("Wallet connected"); }
        catch { toast.error("Failed to connect wallet"); }
      }}
      disabled={status === "connecting"}
      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[var(--gradient-cyber)] px-4 py-2 text-sm font-semibold text-background transition disabled:opacity-60"
      style={{ boxShadow: "var(--shadow-glow-blue)" }}
    >
      <Wallet size={16} />
      {compact ? "Connect" : status === "connecting" ? "Connecting…" : "Connect Wallet"}
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
    </button>
  );
}
