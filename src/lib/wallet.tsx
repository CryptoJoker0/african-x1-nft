/**
 * Wallet layer for AFRICAN X1 NFT.
 *
 * Supports Phantom, Backpack, and X1 Web wallet (all Solana-style injected
 * providers, since X1 is a Solana fork). Falls back to an ephemeral
 * simulated address only when no injected provider is present, so the rest
 * of the app can be exercised before deployment.
 *
 * RPC + treasury are read from collection_config (set to X1 mainnet).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type WalletStatus = "disconnected" | "connecting" | "connected";

export type WalletId = "phantom" | "backpack" | "x1web";

export interface WalletOption {
  id: WalletId;
  name: string;
  tagline: string;
  installUrl: string;
  detect: () => InjectedSolana | null;
}

export interface InjectedSolana {
  isPhantom?: boolean;
  isBackpack?: boolean;
  isX1?: boolean;
  publicKey?: { toString(): string } | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  signAndSendTransaction?: (tx: unknown) => Promise<{ signature: string }>;
  signTransaction?: <T>(tx: T) => Promise<T>;
}

export function getInjectedProvider(id: WalletId | null): InjectedSolana | null {
  if (!id) return null;
  const opt = WALLET_OPTIONS.find((o) => o.id === id);
  return opt?.detect() ?? null;
}

declare global {
  interface Window {
    solana?: InjectedSolana;
    phantom?: { solana?: InjectedSolana };
    backpack?: InjectedSolana;
    xnft?: { solana?: InjectedSolana };
    x1?: InjectedSolana;
    x1Wallet?: InjectedSolana;
  }
}

export const WALLET_OPTIONS: WalletOption[] = [
  {
    id: "phantom",
    name: "Phantom",
    tagline: "Most popular Solana wallet",
    installUrl: "https://phantom.app/download",
    detect: () => {
      if (typeof window === "undefined") return null;
      const p = window.phantom?.solana;
      if (p?.isPhantom) return p;
      if (window.solana?.isPhantom) return window.solana;
      return null;
    },
  },
  {
    id: "backpack",
    name: "Backpack",
    tagline: "xNFT-native wallet",
    installUrl: "https://backpack.app/download",
    detect: () => {
      if (typeof window === "undefined") return null;
      if (window.backpack) return window.backpack;
      const x = window.xnft?.solana;
      if (x) return x;
      if (window.solana?.isBackpack) return window.solana;
      return null;
    },
  },
  {
    id: "x1web",
    name: "X1 Web Wallet",
    tagline: "Native X1 mainnet wallet",
    installUrl: "https://wallet.x1.xyz",
    detect: () => {
      if (typeof window === "undefined") return null;
      return window.x1Wallet ?? window.x1 ?? (window.solana?.isX1 ? window.solana : null);
    },
  },
];

interface WalletContextValue {
  address: string | null;
  status: WalletStatus;
  isSimulated: boolean;
  walletId: WalletId | null;
  connect: (id?: WalletId) => Promise<void>;
  disconnect: () => Promise<void>;
  shortAddress: string;
  options: WalletOption[];
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
  const [walletId, setWalletId] = useState<WalletId | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try {
        const { address: a, simulated, walletId: w } = JSON.parse(stored);
        if (a) {
          setAddress(a);
          setIsSimulated(!!simulated);
          setWalletId((w as WalletId) ?? null);
          setStatus("connected");
        }
      } catch { /* ignore */ }
      return;
    }
    // Silent reconnect to the first detected provider
    for (const opt of WALLET_OPTIONS) {
      const provider = opt.detect();
      if (provider?.connect) {
        provider.connect({ onlyIfTrusted: true })
          .then((r) => {
            const a = r.publicKey.toString();
            setAddress(a); setStatus("connected"); setIsSimulated(false); setWalletId(opt.id);
            localStorage.setItem(LS_KEY, JSON.stringify({ address: a, simulated: false, walletId: opt.id }));
          })
          .catch(() => {});
        break;
      }
    }
  }, []);

  const connect = useCallback(async (id?: WalletId) => {
    setStatus("connecting");
    try {
      if (id) {
        const opt = WALLET_OPTIONS.find((o) => o.id === id);
        if (!opt) throw new Error("Unknown wallet");
        const provider = opt.detect();
        if (!provider) {
          setStatus("disconnected");
          window.open(opt.installUrl, "_blank", "noopener,noreferrer");
          throw new Error(`${opt.name} not detected. Install it and retry.`);
        }
        const r = await provider.connect();
        const a = r.publicKey.toString();
        setAddress(a); setIsSimulated(false); setWalletId(id); setStatus("connected");
        localStorage.setItem(LS_KEY, JSON.stringify({ address: a, simulated: false, walletId: id }));
        return;
      }
      // No id: simulated fallback for dev preview
      const a = genSimulatedAddress();
      setAddress(a); setIsSimulated(true); setWalletId(null); setStatus("connected");
      localStorage.setItem(LS_KEY, JSON.stringify({ address: a, simulated: true, walletId: null }));
    } catch (e) {
      setStatus("disconnected");
      throw e;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (walletId) {
        const opt = WALLET_OPTIONS.find((o) => o.id === walletId);
        await opt?.detect()?.disconnect();
      }
    } catch { /* ignore */ }
    localStorage.removeItem(LS_KEY);
    setAddress(null); setIsSimulated(false); setWalletId(null); setStatus("disconnected");
  }, [walletId]);

  const value = useMemo<WalletContextValue>(() => ({
    address, status, isSimulated, walletId, connect, disconnect,
    shortAddress: shorten(address), options: WALLET_OPTIONS,
  }), [address, status, isSimulated, walletId, connect, disconnect]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
