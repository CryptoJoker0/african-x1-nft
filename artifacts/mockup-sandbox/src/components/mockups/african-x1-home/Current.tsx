import { ArrowUpRight, ChevronDown, ExternalLink, Sparkles, Wallet } from "lucide-react";
import { useState } from "react";

import "./_group.css";

const nav = ["Home", "Collection", "Mint", "Market", "My NFTs", "Staking"];

const roadmap = [
  {
    phase: "Phase 01",
    status: "done",
    title: "Genesis Reveal",
    desc: "Art and lore drop. Whitelist opens for early supporters and creators.",
  },
  {
    phase: "Phase 02",
    status: "active",
    title: "Public Mint",
    desc: "Fifty NFTs live on X1 Mainnet. Random assignment, verifiable provenance.",
  },
  {
    phase: "Phase 03",
    status: "upcoming",
    title: "Holder Utility",
    desc: "Token-gated drops, staking, and IRL events across African capitals.",
  },
  {
    phase: "Phase 04",
    status: "upcoming",
    title: "Creator DAO",
    desc: "Treasury funds African digital artists. Holders vote on grants.",
  },
];

const faq = [
  {
    q: "What is AFRICAN X1 NFT?",
    a: "A 50-piece NFT collection minted natively on the X1 Blockchain that celebrates African culture, mythology and futurism.",
  },
  {
    q: "How do I mint?",
    a: "Connect a compatible wallet on X1, head to the Mint page, and approve the transaction.",
  },
  {
    q: "What is the mint price?",
    a: "The current mint price is shown in the live ticker above. Whitelisted wallets may receive a discount.",
  },
  {
    q: "How is rarity assigned?",
    a: "Traits are generated from 250+ hand-illustrated assets. Rarity ranks are calculated on reveal.",
  },
  {
    q: "Are royalties enforced?",
    a: "Yes. A creator royalty is built into the on-chain metadata and supported by all major X1 marketplaces.",
  },
];

export function Current() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="x1-current">
      <div className="x1-hairline-grid" aria-hidden />

      <header className="x1-header">
        <div className="x1-shell x1-header-inner">
          <a className="x1-logo-link" href="#top">
            <img className="x1-logo-image" src="/__mockup/images/african-x1-logo.jpg" alt="African X1" />
            <div>
              <div className="x1-display x1-logo-word">
                African <span className="x1-serif-italic x1-gold-gradient">X1</span>
              </div>
              <div className="x1-label" style={{ marginTop: 4 }}>
                Genesis · X1 Chain
              </div>
            </div>
          </a>

          <nav className="x1-nav" aria-label="Primary navigation">
            {nav.map((item, index) => (
              <a key={item} href={item === "Home" ? "#top" : `#${item.toLowerCase().replace(" ", "-")}`}>
                <span className="x1-label">{String(index + 1).padStart(2, "0")}</span>
                <span className="x1-display" style={{ fontSize: 18 }}>
                  {item}
                </span>
                {item === "Home" && <span className="x1-nav-dot" />}
              </a>
            ))}
          </nav>

          <div className="x1-header-actions">
            <a className="x1-pill x1-staking-pill" href="#roadmap">
              <span>🌍</span>
              <span>Africa Staking</span>
            </a>
            <a className="x1-pill x1-barbie-pill" href="#marketplace">
              <Sparkles size={13} />
              <span>Buy AF</span>
              <ExternalLink size={12} />
            </a>
            <a className="x1-pill x1-wallet-pill" href="#mint">
              <Wallet size={15} />
              <span>Connect Wallet</span>
            </a>
          </div>
        </div>
        <div className="x1-rule" style={{ opacity: 0.4 }} />
      </header>

      <div id="top" className="x1-nav-rail">
        <div className="x1-shell x1-masthead">
          <span className="x1-label">Volume I · Issue 001</span>
          <span className="x1-label">Saturday, August 15, 2026</span>
          <span className="x1-label">Genesis Edition</span>
        </div>
      </div>

      <main>
        <section className="x1-shell x1-hero">
          <div className="x1-hero-grid">
            <aside className="x1-hero-rail">
              <div className="x1-folio">01</div>
              <div className="x1-label">The Genesis Feature</div>
              <div className="x1-rail-note">
                <div className="x1-label">Filed under</div>
                <div className="x1-display" style={{ fontSize: 24, marginTop: 8 }}>
                  Culture,
                  <br />
                  <span className="x1-serif-italic" style={{ color: "var(--x1-gold)" }}>
                    Code
                  </span>{" "}
                  &amp; Chain
                </div>
              </div>
            </aside>

            <div className="x1-hero-copy">
              <div className="x1-eyebrow">
                <span style={{ background: "var(--x1-gold)", borderRadius: "50%", display: "inline-block", height: 6, marginRight: 10, width: 6 }} />
                Our Heritage · Our Pride · Our Legacy
              </div>
              <h1>
                More than an <span className="x1-serif-italic x1-gold-gradient">NFT</span>.
                <br />
                A <span className="x1-gold-gradient">living</span>
                <br />
                <span className="x1-serif-italic">legacy.</span>
              </h1>
              <p>
                The <strong>AFRICAN X1 NFT</strong> Collection is a digital archive of Africa&apos;s
                identity — preserving our cultures, kingdoms, traditions, ceremonies and stories
                forever on the X1 Blockchain. Every mask, every symbol, every color carries the
                spirit of our ancestors and the dreams of generations yet to come.
              </p>
              <div className="x1-hero-actions">
                <a href="#mint" className="x1-cta">
                  Become a guardian <ArrowUpRight size={18} />
                </a>
                <a href="#mint" className="x1-pill x1-wallet-pill">
                  <Wallet size={16} /> Connect Wallet
                </a>
              </div>
            </div>

            <div className="x1-cover-wrap">
              <div className="x1-cover-meta x1-label">
                <span>Cover · Volume I</span>
                <span>Genesis</span>
              </div>
              <div className="x1-cover">
                <img
                  src="/__mockup/images/african-x1-cover.jpg"
                  alt="Africa X1 — a continent rendered as living, on-chain terrain"
                />
                <div className="x1-cover-caption">
                  <div className="x1-serif-italic">A continent, on-chain</div>
                  <div className="x1-label" style={{ marginTop: 4 }}>
                    From ancient masks to royal heritage
                  </div>
                </div>
              </div>
              <div className="x1-cover-foot x1-label">
                <span>X1 Mainnet</span>
                <span>1.00 XNT</span>
              </div>
            </div>
          </div>
        </section>

        <section className="x1-status">
          <div className="x1-shell">
            <div className="x1-stats">
              <Stat label="Status" value="Live" tone="cyan" />
              <Stat label="Minted" value="12" />
              <Stat label="Remaining" value="38" tone="gold" />
              <Stat label="Supply" value="50" />
              <Stat label="Chain" value="X1" />
            </div>
            <div className="x1-progress-meta x1-label">
              <span>Genesis progress</span>
              <span>24.0% subscribed</span>
            </div>
            <div className="x1-progress-track">
              <span />
            </div>
          </div>
        </section>

        <section id="story" className="x1-shell x1-editorial-section">
          <div className="x1-section-grid">
            <SectionLabel number="02" label="The Story" />
            <div>
              <h2 className="x1-display" style={{ fontSize: "clamp(42px, 5vw, 64px)", margin: 0 }}>
                History transformed
                <br />
                into <span className="x1-serif-italic x1-gold-gradient">ownership</span>.
              </h2>
              <div className="x1-story-copy">
                <p>
                  This is not just digital art. This is the heartbeat of a continent that has
                  inspired the world for thousands of years. Every NFT represents courage,
                  resilience, unity, creativity and the rich diversity of Africa&apos;s people —
                  from ancient masks to royal heritage, from tribal traditions to modern
                  innovation.
                </p>
                <p>
                  When you own an AFRICAN X1 NFT, you are not simply purchasing an asset. You are
                  embracing a mission — saying{" "}
                  <span className="x1-serif-italic">
                    &quot;I believe Africa&apos;s story deserves to be preserved, celebrated and
                    shared with the world.&quot;
                  </span>{" "}
                  Built on the X1 Blockchain, this collection is a bridge between our past and our
                  future.
                </p>
              </div>
              <div className="x1-feature-grid">
                {[
                  ["i.", "Heritage", "Cultures & kingdoms preserved."],
                  ["ii.", "Ownership", "Guardianship, on-chain."],
                  ["iii.", "Unity", "For every believer in culture."],
                  ["iv.", "Legacy", "Written forever on X1."],
                ].map(([number, title, copy]) => (
                  <div className="x1-feature" key={title}>
                    <div className="x1-feature-number">{number}</div>
                    <div className="x1-feature-title">{title}</div>
                    <div className="x1-feature-copy">{copy}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="roadmap" className="x1-roadmap x1-editorial-section">
          <div className="x1-shell">
            <div className="x1-section-grid">
              <SectionLabel number="03" label="The Roadmap" />
              <div>
                <h2 className="x1-display" style={{ fontSize: "clamp(42px, 5vw, 64px)", margin: 0 }}>
                  From <span className="x1-serif-italic x1-gold-gradient">genesis</span> to a
                  <br />
                  continental web3 ecosystem.
                </h2>
                <div style={{ marginTop: 48 }}>
                  {roadmap.map((item, index) => (
                    <div className="x1-roadmap-row" key={item.title}>
                      <div className="x1-roadmap-number">{String(index + 1).padStart(2, "0")}</div>
                      <div>
                        <div className="x1-label" style={{ color: item.status === "active" ? "var(--x1-gold)" : item.status === "done" ? "var(--x1-cyan)" : undefined }}>
                          {item.phase} · {item.status}
                        </div>
                        <div className="x1-roadmap-title" style={{ marginTop: 8 }}>{item.title}</div>
                      </div>
                      <div className="x1-roadmap-desc">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="x1-shell x1-editorial-section">
          <div className="x1-section-grid">
            <SectionLabel number="04" label="Frequently Asked" />
            <div>
              <h2 className="x1-display" style={{ fontSize: "clamp(42px, 5vw, 64px)", margin: 0 }}>
                Answers, <span className="x1-serif-italic x1-gold-gradient">plainly</span>.
              </h2>
              <div style={{ marginTop: 40 }}>
                {faq.map((item, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <button
                      className="x1-faq-item"
                      key={item.q}
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      type="button"
                    >
                      <div className="x1-faq-question">
                        <span>
                          <span className="x1-faq-number">{String(index + 1).padStart(2, "0")}</span>
                          <strong>{item.q}</strong>
                        </span>
                        <ChevronDown className={`x1-chevron${isOpen ? " open" : ""}`} size={18} />
                      </div>
                      {isOpen && <p className="x1-faq-answer">{item.a}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="marketplace" className="x1-footer">
        <div className="x1-rule" style={{ opacity: 0.5 }} />
        <div className="x1-shell">
          <div className="x1-footer-grid">
            <div>
              <div className="x1-label">Colophon · No. 001</div>
              <h3 className="x1-display x1-footer-title" style={{ marginTop: 16 }}>
                A tribute to the <span className="x1-serif-italic x1-gold-gradient">spirit</span>,
                <br />
                minted on-chain.
              </h3>
              <p className="x1-footer-copy">
                Fifty pieces. One continent. Each token a fragment of African mythology, tribes and
                futurism — permanently indexed on the X1 blockchain.
              </p>
            </div>
            <div>
              <div className="x1-label" style={{ marginBottom: 16 }}>Sections</div>
              <ul className="x1-footer-links">
                <li><a href="#story">Story</a></li>
                <li><a href="#roadmap">Roadmap</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>
            <div>
              <div className="x1-label" style={{ marginBottom: 16 }}>Collection</div>
              <ul className="x1-footer-links">
                <li><a href="#mint">Mint</a></li>
                <li><a href="#marketplace">Marketplace</a></li>
                <li><a href="#staking">Staking</a></li>
              </ul>
            </div>
          </div>
          <div className="x1-footer-bottom">
            <div className="x1-logo-link">
              <img className="x1-logo-image" src="/__mockup/images/african-x1-logo.jpg" alt="" style={{ height: 28, width: 28 }} />
              <span className="x1-label">© 2026 · Volume I · All rights reserved</span>
            </div>
            <span className="x1-label">Set in Instrument Serif &amp; Work Sans · Pressed on X1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "gold" | "cyan" }) {
  return (
    <div>
      <div className="x1-label">{label}</div>
      <div className={`x1-stat-value${tone ? ` ${tone}` : ""}`}>{value}</div>
    </div>
  );
}

function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="x1-section-title">
      <div className="x1-folio" style={{ fontSize: 80 }}>{number}</div>
      <div className="x1-label" style={{ marginTop: 10 }}>{label}</div>
      <div className="x1-rule" />
    </div>
  );
}