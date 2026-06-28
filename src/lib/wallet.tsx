/**
 * Wallet layer for AFRICAN X1 NFT.
 *
 * Pragmatic, swap-ready abstraction:
 * - Today: detects a Solana-style injected wallet (Phantom / Backpack / OKX)
 *   exposed at window.solana. Falls back to a generated ephemeral address
 *   stored in localStorage so the rest of the app can be exercised before
 *   the X1 mainnet program ID + RPC are wired.
 * - Tomorrow: replace `connectInjected` with @solana/wallet-adapter
 *   pointed at the X1 RPC; everything downstream (useWallet hook,
 *   address display, signing surface) stays identical.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type WalletStatus = "disconnected" | "connecting" | "connected";

interface InjectedSolana {
  isPhantom?: boolean;
  publicKey?: { toString(): string } | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window { solana?: InjectedSolana }
}

interface WalletContextValue {
  address: string | null;
  status: WalletStatus;
  isSimulated: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  shortAddress: string;
}

const WalletContext = createContext<WalletContextValue | null>(null);
const LS_KEY = "afrx1.wallet";

function shorten(addr: string | null) {
  if (!addr) return "";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function genSimulatedAddress() {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 44; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [isSimulated, setIsSimulated] = useState(false);

  // Restore on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try {
        const { address: a, simulated } = JSON.parse(stored);
        if (a) {
          setAddress(a);
          setIsSimulated(!!simulated);
          setStatus("connected");
        }
      } catch { /* ignore */ }
    }
    // try silent reconnect to injected
    const sol = window.solana;
    if (sol?.connect && !stored) {
      sol.connect({ onlyIfTrusted: true })
        .then((r) => {
          const a = r.publicKey.toString();
          setAddress(a); setStatus("connected"); setIsSimulated(false);
          localStorage.setItem(LS_KEY, JSON.stringify({ address: a, simulated: false }));
        })
        .catch(() => {});
    }
  }, []);

  const connect = useCallback(async () => {
    setStatus("connecting");
    try {
      const sol = typeof window !== "undefined" ? window.solana : undefined;
      if (sol?.connect) {
        const r = await sol.connect();
        const a = r.publicKey.toString();
        setAddress(a); setIsSimulated(false); setStatus("connected");
        localStorage.setItem(LS_KEY, JSON.stringify({ address: a, simulated: false }));
        return;
      }
      // Fallback: simulated wallet
      const a = genSimulatedAddress();
      setAddress(a); setIsSimulated(true); setStatus("connected");
      localStorage.setItem(LS_KEY, JSON.stringify({ address: a, simulated: true }));
    } catch (e) {
      setStatus("disconnected");
      throw e;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try { await window.solana?.disconnect(); } catch { /* ignore */ }
    localStorage.removeItem(LS_KEY);
    setAddress(null); setIsSimulated(false); setStatus("disconnected");
  }, []);

  const value = useMemo<WalletContextValue>(() => ({
    address, status, isSimulated, connect, disconnect, shortAddress: shorten(address),
  }), [address, status, isSimulated, connect, disconnect]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
