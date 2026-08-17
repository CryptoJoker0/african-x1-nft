import { ArrowUpRight, ChevronDown, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";

import cover from "@/assets/african-x1-cover.png.asset.json";
import logo from "@/assets/african-x1-logo.asset.json";
import { WalletButton } from "./WalletButton";

import "./EditorialHome.css";

export interface EditorialHomeConfig {
  collection_name: string;
  max_supply: number;
  mint_price: number;
  mint_paused: boolean;
  whitelist_only: boolean;
  revealed: boolean;
}

const phases = [
  [
    "Phase 01 · complete",
    "Genesis Reveal",
    "Art and lore drop. Whitelist opens for early supporters and creators.",
    false,
  ],
  [
    "Phase 02 · live now",
    "Public Mint",
    "Fifty NFTs live on X1 Mainnet. Random assignment, verifiable provenance.",
    true,
  ],
  [
    "Phase 03 · next",
    "Holder Utility",
    "Token-gated drops, staking, and IRL events across African capitals.",
    false,
  ],
  [
    "Phase 04 · next",
    "Creator DAO",
    "Treasury funds African digital artists. Holders vote on grants.",
    false,
  ],
] as const;

const questions = [
  [
    "What is AFRICAN X1 NFT?",
    "A 50-piece NFT collection minted natively on the X1 Blockchain that celebrates African culture, mythology and futurism.",
  ],
  [
    "How do I mint?",
    "Connect a compatible wallet on X1, head to the Mint page, and approve the transaction.",
  ],
  [
    "What is the mint price?",
    "The current mint price is shown in the live ticker above. Whitelisted wallets may receive a discount.",
  ],
  [
    "How is rarity assigned?",
    "Traits are generated from 250+ hand-illustrated assets. Rarity ranks are calculated on reveal.",
  ],
] as const;

export function EditorialHome({
  config,
  minted,
}: {
  config: EditorialHomeConfig | null | undefined;
  minted: number;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const maxSupply = config?.max_supply ?? 50;
  const remaining = Math.max(0, maxSupply - minted);
  const progress = maxSupply > 0 ? (minted / maxSupply) * 100 : 0;
  const status = config?.mint_paused ? "Paused" : config?.whitelist_only ? "Whitelist" : "Live";
  const mintPrice = config?.mint_price == null ? "—" : `${config.mint_price.toFixed(2)} XNT`;

  return (
    <div className="x1-split">
      <header>
        <div className="shell topbar">
          <Link className="brand" to="/">
            <img src={logo.url} alt="African X1 mark" />
            <div>
              <div className="serif brand-name">
                African <i className="gold">X1</i>
              </div>
              <div className="label">Genesis · X1 Chain</div>
            </div>
          </Link>
          <nav className="topnav" aria-label="Homepage sections">
            <a href="#top">01 Home</a>
            <a href="#story">02 Story</a>
            <a href="#roadmap">03 Roadmap</a>
            <a href="#faq">04 FAQ</a>
          </nav>
          <div className="wallet-slot">
            <WalletButton />
          </div>
        </div>
        <div className="shell edition label">
          <span>Volume I · Issue 001</span>
          <span>Saturday, August 15, 2026</span>
          <span className="gold">Genesis Edition</span>
        </div>
      </header>

      <main id="top">
        <a
          className="validator-float"
          href="/barbiefun-validator.html"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open BARBIEFUN-VALIDATOR in a new tab"
        >
          <span className="validator-float-icon" aria-hidden="true">
            <ShieldCheck size={19} strokeWidth={1.8} />
          </span>
          <span className="validator-float-copy">
            <span className="validator-float-kicker">Official access</span>
            <strong>BARBIEFUN-VALIDATOR</strong>
          </span>
          <ArrowUpRight className="validator-float-arrow" size={17} aria-hidden="true" />
        </a>
        <section className="shell hero">
          <div className="hero-art">
            <div className="serif folio">01</div>
            <div className="label">The Genesis Feature</div>
            <div className="cover">
              <img src={cover.url} alt="A continent rendered as living, on-chain terrain" />
              <div className="cover-caption">
                <strong className="serif italic">A continent, on-chain</strong>
                <span className="label">From ancient masks to royal heritage</span>
              </div>
            </div>
            <div className="cover-foot label">
              <span>X1 Mainnet</span>
              <span className="gold">{mintPrice}</span>
            </div>
          </div>
          <div className="hero-copy">
            <div className="eyebrow">● &nbsp;Our heritage · Our pride · Our legacy</div>
            <h1>
              More than an <em className="serif">NFT</em>.
              <br />A <span className="gold">living</span>
              <br />
              <em className="serif">legacy.</em>
            </h1>
            <p className="lead">
              The <b>AFRICAN X1 NFT</b> Collection is a digital archive of Africa&apos;s identity —
              preserving our cultures, kingdoms, traditions, ceremonies and stories forever on the
              X1 Blockchain.
            </p>
            <div className="actions">
              <Link className="cta" to="/mint">
                Become a guardian <ArrowUpRight size={18} />
              </Link>
              <a className="text-link" href="#story">
                Read the story ↓
              </a>
            </div>
          </div>
        </section>

        <section className="shell stats" aria-label="Live collection status">
          <Stat label="Status" value={status} tone={status === "Live" ? "cyan" : "gold"} />
          <Stat label="Minted" value={minted.toLocaleString()} />
          <Stat label="Remaining" value={remaining.toLocaleString()} tone="gold" />
          <Stat label="Supply" value={maxSupply.toLocaleString()} />
          <Stat label="Chain" value="X1" />
          <div className="progress">
            <div className="progress-meta label">
              <span>Genesis progress</span>
              <span>{progress.toFixed(1)}% subscribed</span>
            </div>
            <div className="track">
              <i style={{ width: `${Math.max(progress, 0.5)}%` }} />
            </div>
          </div>
        </section>

        <section id="story" className="shell section">
          <SectionIndex number="02" label="The Story" />
          <div>
            <h2>
              History transformed
              <br />
              into <em className="serif gold">ownership</em>.
            </h2>
            <div className="story-body">
              <p>
                This is not just digital art. This is the heartbeat of a continent that has inspired
                the world for thousands of years. Every NFT represents courage, resilience, unity,
                creativity and the rich diversity of Africa&apos;s people.
              </p>
              <p>
                When you own an AFRICAN X1 NFT, you are embracing a mission — saying{" "}
                <em className="serif">
                  “I believe Africa&apos;s story deserves to be preserved, celebrated and shared
                  with the world.”
                </em>
              </p>
            </div>
            <div className="feature-list">
              {[
                ["i.", "Heritage", "Cultures & kingdoms preserved."],
                ["ii.", "Ownership", "Guardianship, on-chain."],
                ["iii.", "Unity", "For every believer in culture."],
                ["iv.", "Legacy", "Written forever on X1."],
              ].map(([number, title, description]) => (
                <div className="feature" key={title}>
                  <span className="gold serif italic">{number}</span>
                  <b>{title}</b>
                  <span>{description}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="roadmap" className="shell section">
          <SectionIndex number="03" label="The Roadmap" />
          <div>
            <h2>
              From <em className="serif gold">genesis</em> to a
              <br />
              continental web3 ecosystem.
            </h2>
            <div className="roadmap">
              {phases.map(([meta, title, description, active]) => (
                <article className="phase" key={title}>
                  <div className={`phase-head label ${active ? "active" : ""}`}>
                    <span>{meta}</span>
                    <span>{active ? "●" : "○"}</span>
                  </div>
                  <h3 className="serif">{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="shell section">
          <SectionIndex number="04" label="Frequently Asked" />
          <div>
            <h2>
              Answers, <em className="serif gold">plainly</em>.
            </h2>
            <div className="faq" style={{ marginTop: 38 }}>
              {questions.map(([question, answer], index) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => setOpen(open === index ? null : index)}
                  aria-expanded={open === index}
                >
                  <div className="q">
                    <strong>{question}</strong>
                    <ChevronDown
                      size={18}
                      className={open === index ? "gold" : ""}
                      style={{ transform: open === index ? "rotate(180deg)" : undefined }}
                    />
                  </div>
                  {open === index && <div className="answer">{answer}</div>}
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="shell">
        <div className="footer-main">
          <div>
            <div className="label">Colophon · No. 001</div>
            <div className="serif footer-title" style={{ marginTop: 15 }}>
              A tribute to the <em className="gold">spirit</em>,
              <br />
              minted on-chain.
            </div>
            <p className="footer-copy">
              Fifty pieces. One continent. Each token a fragment of African mythology, tribes and
              futurism — permanently indexed on the X1 blockchain.
            </p>
          </div>
          <div className="footer-links">
            <a href="#story">Story</a>
            <a href="#roadmap">Roadmap</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
        <div className="footer-bottom label">
          <span>© 2026 · Volume I · All rights reserved</span>
          <span>Set in Instrument Serif &amp; Work Sans</span>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "gold" | "cyan" }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className={`stat-value ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function SectionIndex({ number, label }: { number: string; label: string }) {
  return (
    <div className="section-index serif">
      {number}
      <small>{label}</small>
    </div>
  );
}