import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { WalletButton } from "./WalletButton";

const nav = [
  { to: "/", label: "Home" },
  { to: "/collection", label: "Collection" },
  { to: "/mint", label: "Mint" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 backdrop-blur-xl bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="shrink-0"><Logo /></Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => {
            const active = pathname === n.to || (n.to !== "/" && pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active ? "text-cyber-cyan" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-cyber-cyan to-transparent" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden md:block"><WalletButton /></div>
          <button
            className="rounded-md p-2 text-foreground md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/5 bg-background/95 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 p-4">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/5"
              >
                {n.label}
              </Link>
            ))}
            <div className="pt-2"><WalletButton /></div>
          </div>
        </div>
      )}
    </header>
  );
}
