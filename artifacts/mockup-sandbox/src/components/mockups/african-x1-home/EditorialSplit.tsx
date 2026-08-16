import { ArrowUpRight, ChevronDown, WalletCards } from "lucide-react";
import { useState } from "react";

import "./EditorialSplit.css";

const phases = [
  ["Phase 01 · complete", "Genesis Reveal", "Art and lore drop. Whitelist opens for early supporters and creators.", false],
  ["Phase 02 · live now", "Public Mint", "Fifty NFTs live on X1 Mainnet. Random assignment, verifiable provenance.", true],
  ["Phase 03 · next", "Holder Utility", "Token-gated drops, staking, and IRL events across African capitals.", false],
  ["Phase 04 · next", "Creator DAO", "Treasury funds African digital artists. Holders vote on grants.", false],
] as const;

const questions = [
  ["What is AFRICAN X1 NFT?", "A 50-piece NFT collection minted natively on the X1 Blockchain that celebrates African culture, mythology and futurism."],
  ["How do I mint?", "Connect a compatible wallet on X1, head to the Mint page, and approve the transaction."],
  ["What is the mint price?", "The current mint price is shown in the live ticker above. Whitelisted wallets may receive a discount."],
  ["How is rarity assigned?", "Traits are generated from 250+ hand-illustrated assets. Rarity ranks are calculated on reveal."],
];

export function EditorialSplit() {
  const [open, setOpen] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  return (
    <div className="x1-split">
      <header>
        <div className="shell topbar">
          <a className="brand" href="#top">
            <img src="/__mockup/images/african-x1-logo.jpg" alt="African X1 mark" />
            <div><div className="serif brand-name">African <i className="gold">X1</i></div><div className="label">Genesis · X1 Chain</div></div>
          </a>
          <nav className="topnav"><a href="#top">01 Home</a><a href="#story">02 Story</a><a href="#roadmap">03 Roadmap</a><a href="#faq">04 FAQ</a></nav>
          <button className="wallet" onClick={() => setConnected((value) => !value)}><WalletCards size={14} style={{ verticalAlign: "middle", marginRight: 7 }} />{connected ? "0x71…A91" : "Connect wallet"}</button>
        </div>
        <div className="shell edition label"><span>Volume I · Issue 001</span><span>Saturday, August 15, 2026</span><span className="gold">Genesis Edition</span></div>
      </header>

      <main id="top">
        <section className="shell hero">
          <div className="hero-art">
            <div className="serif folio">01</div>
            <div className="label">The Genesis Feature</div>
            <div className="cover"><img src="/__mockup/images/african-x1-cover.jpg" alt="A continent rendered as living, on-chain terrain" /><div className="cover-caption"><strong className="serif italic">A continent, on-chain</strong><span className="label">From ancient masks to royal heritage</span></div></div>
            <div className="cover-foot label"><span>X1 Mainnet</span><span className="gold">1.00 XNT</span></div>
          </div>
          <div className="hero-copy">
            <div className="eyebrow">● &nbsp;Our heritage · Our pride · Our legacy</div>
            <h1>More than an <em className="serif">NFT</em>.<br />A <span className="gold">living</span><br /><em className="serif">legacy.</em></h1>
            <p className="lead">The <b>AFRICAN X1 NFT</b> Collection is a digital archive of Africa&apos;s identity — preserving our cultures, kingdoms, traditions, ceremonies and stories forever on the X1 Blockchain.</p>
            <div className="actions"><a className="cta" href="#mint">Become a guardian <ArrowUpRight size={18} /></a><a className="text-link" href="#story">Read the story ↓</a></div>
          </div>
        </section>

        <section className="shell stats">
          {[["Status", "Live", "cyan"], ["Minted", "12", ""], ["Remaining", "38", "gold"], ["Supply", "50", ""], ["Chain", "X1", ""]].map(([label, value, tone]) => <div className="stat" key={label}><div className="label">{label}</div><div className={`stat-value ${tone}`}>{value}</div></div>)}
          <div className="progress"><div className="progress-meta label"><span>Genesis progress</span><span>24.0% subscribed</span></div><div className="track"><i /></div></div>
        </section>

        <section id="story" className="shell section">
          <div className="section-index serif">02<small>The Story</small></div>
          <div><h2>History transformed<br />into <em className="serif gold">ownership</em>.</h2><div className="story-body"><p>This is not just digital art. This is the heartbeat of a continent that has inspired the world for thousands of years. Every NFT represents courage, resilience, unity, creativity and the rich diversity of Africa&apos;s people.</p><p>When you own an AFRICAN X1 NFT, you are embracing a mission — saying <em className="serif">“I believe Africa&apos;s story deserves to be preserved, celebrated and shared with the world.”</em></p></div><div className="feature-list">{[["i.", "Heritage", "Cultures & kingdoms preserved."], ["ii.", "Ownership", "Guardianship, on-chain."], ["iii.", "Unity", "For every believer in culture."], ["iv.", "Legacy", "Written forever on X1."]].map(([n, t, d]) => <div className="feature" key={t}><span className="gold serif italic">{n}</span><b>{t}</b><span>{d}</span></div>)}</div></div>
        </section>

        <section id="roadmap" className="shell section"><div className="section-index serif">03<small>The Roadmap</small></div><div><h2>From <em className="serif gold">genesis</em> to a<br />continental web3 ecosystem.</h2><div className="roadmap">{phases.map(([meta, title, desc, active]) => <article className="phase" key={title}><div className={`phase-head label ${active ? "active" : ""}`}><span>{meta}</span><span>{active ? "●" : "○"}</span></div><h3 className="serif">{title}</h3><p>{desc}</p></article>)}</div></div></section>

        <section id="faq" className="shell section"><div className="section-index serif">04<small>Frequently Asked</small></div><div><h2>Answers, <em className="serif gold">plainly</em>.</h2><div className="faq" style={{ marginTop: 38 }}>{questions.map(([q, a], index) => <button type="button" key={q} onClick={() => setOpen(open === index ? null : index)}><div className="q"><strong>{q}</strong><ChevronDown size={18} className={open === index ? "gold" : ""} style={{ transform: open === index ? "rotate(180deg)" : undefined }} /></div>{open === index && <div className="answer">{a}</div>}</button>)}</div></div></section>
      </main>
      <footer className="shell"><div className="footer-main"><div><div className="label">Colophon · No. 001</div><div className="serif footer-title" style={{ marginTop: 15 }}>A tribute to the <em className="gold">spirit</em>,<br />minted on-chain.</div><p className="footer-copy">Fifty pieces. One continent. Each token a fragment of African mythology, tribes and futurism — permanently indexed on the X1 blockchain.</p></div><div className="footer-links"><a href="#story">Story</a><a href="#roadmap">Roadmap</a><a href="#faq">FAQ</a></div></div><div className="footer-bottom label"><span>© 2026 · Volume I · All rights reserved</span><span>Set in Instrument Serif & Work Sans</span></div></footer>
    </div>
  );
}