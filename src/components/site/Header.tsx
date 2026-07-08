import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { WalletButton } from "./WalletButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const nav = [
  { to: "/", label: "Home", num: "01" },
  { to: "/collection", label: "Collection", num: "02" },
  { to: "/mint", label: "Mint", num: "03" },
  { to: "/marketplace", label: "Market", num: "04" },
  { to: "/dashboard", label: "Dashboard", num: "05" },
] as const;

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [stakingOpen, setStakingOpen] = useState(false);
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
          <button
            onClick={() => setStakingOpen(true)}
            className="hidden items-center gap-1.5 rounded-full border border-african-gold/40 bg-african-gold/10 px-3.5 py-1.5 text-sm font-medium text-african-gold transition hover:bg-african-gold/20 md:flex"
          >
            🔘 Africa 🌍 Staking
          </button>
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
            <button
              onClick={() => {
                setOpen(false);
                setStakingOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-sm border border-african-gold/40 bg-african-gold/10 px-3 py-2.5 text-left text-african-gold"
            >
              🔘 Africa 🌍 Staking
            </button>
            <div className="pt-2">
              <WalletButton />
            </div>
          </div>
        </div>
      )}
      <Dialog open={stakingOpen} onOpenChange={setStakingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🌍 Africa Staking</DialogTitle>
            <DialogDescription>Africa Staking coming soon.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </header>
  );
}
