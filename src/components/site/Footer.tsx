import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Twitter, MessageCircle, Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-32">
      <div className="rule-gold opacity-50" />
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
        <div className="grid gap-12 py-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="label-xs mb-4">Colophon · No. 001</div>
            <h3 className="font-display text-4xl leading-none">
              A tribute to the <span className="serif-italic text-gradient-gold">spirit</span>,
              <br />
              minted on-chain.
            </h3>
            <p className="mt-5 max-w-md text-sm text-muted-foreground">
              Fifty pieces. One continent. Each token a fragment of African mythology, tribes and
              futurism — permanently indexed on the X1 blockchain.
            </p>
            <div className="mt-6 flex gap-2">
              {[
                { Icon: Twitter, href: "#", label: "Twitter" },
                { Icon: MessageCircle, href: "#", label: "Discord" },
                { Icon: Github, href: "#", label: "Github" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="rounded-sm border border-white/10 p-2.5 text-muted-foreground transition hover:border-african-gold/60 hover:text-african-gold"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="label-xs mb-4">Sections</div>
            <ul className="space-y-2.5 font-display text-xl">
              <li>
                <Link to="/collection" className="hover:text-african-gold">
                  Collection
                </Link>
              </li>
              <li>
                <Link to="/mint" className="hover:text-african-gold">
                  Mint
                </Link>
              </li>
              <li>
                <Link to="/marketplace" className="hover:text-african-gold">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link to="/my-nfts" className="hover:text-african-gold">
                  My NFTs
                </Link>
              </li>
              <li>
                <Link to="/staking" className="hover:text-african-gold">
                  Staking
                </Link>
              </li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <div className="label-xs mb-4">Editorial</div>
            <ul className="space-y-2.5 font-display text-xl">
              <li>
                <a href="/#story" className="hover:text-african-gold">
                  Story
                </a>
              </li>
              <li>
                <a href="/#roadmap" className="hover:text-african-gold">
                  Roadmap
                </a>
              </li>
              <li>
                <a href="/#faq" className="hover:text-african-gold">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-start justify-between gap-4 border-t border-white/10 py-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Logo size={28} withWord={false} />
            <div className="label-xs">© 2026 · Volume I · All rights reserved</div>
          </div>
          <div className="label-xs">Set in Instrument Serif &amp; Work Sans · Pressed on X1</div>
        </div>
      </div>
    </footer>
  );
}
