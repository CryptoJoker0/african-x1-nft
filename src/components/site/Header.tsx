import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Menu, Sparkles, X } from "lucide-react";
import { Logo } from "./Logo";
import { WalletButton } from "./WalletButton";

const nav = [
  { to: "/", label: "Home", num: "01" },
  { to: "/collection", label: "Collection", num: "02" },
  { to: "/mint", label: "Mint", num: "03" },
  { to: "/marketplace", label: "Market", num: "04" },
  { to: "/my-nfts", label: "My NFTs", num: "05" },
  { to: "/staking", label: "Staking", num: "06" },
] as const;

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl bg-background/70">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-4 sm:px-10">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((n) => {
            const active = pathname === n.to || (n.to !== "/" && pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`group flex items-baseline gap-1.5 text-sm transition ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`label-xs ${active ? "text-african-gold" : ""}`}>{n.num}</span>
                <span className="font-display text-lg tracking-tight">{n.label}</span>
                {active && <span className="ml-1 h-1 w-1 rounded-full bg-african-gold" />}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/staking"
            className="btn-staking group relative hidden shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-[position:0%_50%] px-4 py-2 text-sm font-semibold text-ink transition-[background-position,filter] duration-500 hover:bg-[position:100%_50%] hover:brightness-110 md:inline-flex"
            style={{ boxShadow: "var(--shadow-glow-staking)" }}
          >
            <span className="text-base leading-none">🌍</span>
            <span className="tracking-tight">Africa Staking</span>
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </Link>
          <a
            href="https://barbie.market"
            target="_blank"
            rel="noreferrer"
            title="Buy AF on Barbie"
            className="btn-barbie group relative hidden shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full bg-[position:0%_50%] px-3 py-2 text-sm font-bold uppercase tracking-wide text-white transition-[background-position,filter] duration-500 hover:bg-[position:100%_50%] hover:brightness-110 md:inline-flex 2xl:px-4"
            style={{ boxShadow: "var(--shadow-glow-barbie)" }}
          >
            <Sparkles size={13} />
            <span className="hidden 2xl:inline">Buy AF on Barbie</span>
            <span className="2xl:hidden">AF</span>
            <ExternalLink size={12} />
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </a>
          <div className="hidden md:block">
            <WalletButton />
          </div>
          <button
            className="rounded-sm p-2 text-foreground md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      <div className="rule-gold opacity-40" />
      {open && (
        <div className="border-t border-white/5 bg-background/95 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 p-4">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="flex items-baseline gap-2 rounded-sm px-3 py-2.5 text-foreground hover:bg-white/5"
              >
                <span className="label-xs text-african-gold">{n.num}</span>
                <span className="font-display text-xl">{n.label}</span>
              </Link>
            ))}
            <Link
              to="/staking"
              onClick={() => setOpen(false)}
              className="btn-staking mt-1 flex items-center justify-center gap-2 rounded-sm px-3 py-2.5 text-left font-semibold text-ink"
              style={{ boxShadow: "var(--shadow-glow-staking)" }}
            >
              <span className="text-base leading-none">🌍</span>
              <span>Africa Staking</span>
            </Link>
            <a
              href="https://barbie.market"
              target="_blank"
              rel="noreferrer"
              className="btn-barbie mt-1 flex items-center justify-center gap-1.5 rounded-sm px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-white"
              style={{ boxShadow: "var(--shadow-glow-barbie)" }}
            >
              <Sparkles size={14} />
              Buy AF on Barbie
              <ExternalLink size={13} />
            </a>
            <div className="pt-2">
              <WalletButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
