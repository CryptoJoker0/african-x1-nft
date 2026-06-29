import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Twitter, MessageCircle, Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan/40 to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo size={42} />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            A 50-piece on-chain tribute to the spirit, mythology and futurism of the African continent — minted natively on the X1 blockchain.
          </p>
          <div className="mt-4 flex gap-3">
            {[
              { Icon: Twitter, href: "#", label: "Twitter" },
              { Icon: MessageCircle, href: "#", label: "Discord" },
              { Icon: Github, href: "#", label: "Github" },
            ].map(({ Icon, href, label }) => (
              <a
                key={label} href={href} aria-label={label}
                className="rounded-full border border-white/10 p-2.5 text-muted-foreground transition hover:border-cyber-cyan/50 hover:text-cyber-cyan"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-xs uppercase tracking-[0.2em] text-african-gold">Explore</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/collection" className="hover:text-foreground">Collection</Link></li>
            <li><Link to="/mint" className="hover:text-foreground">Mint</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs uppercase tracking-[0.2em] text-african-gold">Project</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/#story" className="hover:text-foreground">Story</a></li>
            <li><a href="/#roadmap" className="hover:text-foreground">Roadmap</a></li>
            <li><a href="/#faq" className="hover:text-foreground">FAQ</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} AFRICAN X1 NFT. All rights reserved.</p>
          <p>Built on <span className="text-cyber-cyan">X1 Blockchain</span></p>
        </div>
      </div>
    </footer>
  );
}
