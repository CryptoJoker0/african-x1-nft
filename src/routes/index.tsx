import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WalletButton } from "@/components/site/WalletButton";
import cover from "@/assets/african-x1-cover.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AFRICAN X1 NFT — More Than an NFT. A Living Legacy." },
      {
        name: "description",
        content:
          "A digital archive of Africa's identity — cultures, kingdoms, traditions and stories preserved forever on the X1 Blockchain.",
      },
      { property: "og:title", content: "AFRICAN X1 NFT — A Living Legacy" },
      {
        property: "og:description",
        content:
          "Own a piece of Africa's story. Heritage, pride and legacy — written forever on the X1 Blockchain.",
      },
    ],
  }),
  component: HomePage,
});

interface Config {
  collection_name: string;
  max_supply: number;
  mint_price: number;
  mint_paused: boolean;
  whitelist_only: boolean;
  revealed: boolean;
}

function HomePage() {
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const { data } = await supabase.from("collection_config").select("*").eq("id", 1).single();
      return data as Config | null;
    },
  });
  const { data: minted = 0 } = useQuery({
    queryKey: ["minted-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("nfts")
        .select("*", { count: "exact", head: true })
        .eq("status", "minted");
      return count ?? 0;
    },
  });

  const maxSupply = config?.max_supply ?? 50;
  const remaining = Math.max(0, maxSupply - minted);
  const progress = maxSupply > 0 ? (minted / maxSupply) * 100 : 0;
  const status = config?.mint_paused ? "Paused" : config?.whitelist_only ? "Whitelist" : "Live";
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    );
  }, []);

  return (
    <div>
      {/* MASTHEAD BAND */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground sm:px-10">
          <span>Volume I · Issue 001</span>
          <span className="hidden sm:inline">{today}</span>
          <span className="text-african-gold">Genesis Edition</span>
        </div>
      </div>

      {/* HERO — MAGAZINE COVER */}
      <section className="relative">
        <div className="mx-auto max-w-[1400px] px-6 pt-10 sm:px-10 sm:pt-16">
          <div className="grid grid-cols-12 gap-8">
            {/* Left rail — folio + eyebrow */}
            <aside className="col-span-12 md:col-span-2">
              <div className="flex flex-row items-start justify-between md:flex-col md:gap-10">
                <div>
                  <div className="folio text-[110px] md:text-[140px]">01</div>
                  <div className="mt-2 label-xs">The Genesis Feature</div>
                </div>
                <div className="hidden md:block">
                  <div className="label-xs mb-2">Filed under</div>
                  <div className="font-display text-2xl">
                    Culture,
                    <br />
                    <span className="serif-italic text-african-gold">Code</span> &amp; Chain
                  </div>
                </div>
              </div>
            </aside>

            {/* Center — Headline */}
            <div className="col-span-12 md:col-span-6">
              <div className="eyebrow mb-6 flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-african-gold" />
                Our Heritage · Our Pride · Our Legacy
              </div>
              <h1 className="font-display leading-[0.94] tracking-tight text-[48px] sm:text-[70px] md:text-[88px]">
                More than an <span className="serif-italic text-gradient-gold">NFT</span>.<br />A{" "}
                <span className="shimmer-gold">living</span>
                <br />
                <span className="serif-italic">legacy.</span>
              </h1>
              <p className="mt-8 max-w-lg text-base leading-relaxed text-muted-foreground">
                The <span className="text-african-gold">AFRICAN X1 NFT</span> Collection is a
                digital archive of Africa's identity — preserving our cultures, kingdoms,
                traditions, ceremonies and stories forever on the X1 Blockchain. Every mask, every
                symbol, every color carries the spirit of our ancestors and the dreams of
                generations yet to come.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/mint"
                  className="group inline-flex items-center gap-3 rounded-sm bg-foreground px-6 py-3.5 font-display text-lg text-background transition hover:bg-african-gold"
                >
                  Become a guardian
                  <ArrowUpRight
                    size={18}
                    className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
                <WalletButton />
              </div>
            </div>

            {/* Right — Cover portrait */}
            <div className="col-span-12 md:col-span-4">
              <div className="relative">
                <div className="absolute -top-3 left-0 right-0 flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  <span>Cover · Volume I</span>
                  <span className="text-african-gold">Genesis</span>
                </div>
                <div className="relative mt-6 aspect-square overflow-hidden rounded-sm border border-white/10">
                  <img
                    src={cover.url}
                    alt="Africa X1 — a continent rendered as living, on-chain terrain"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="serif-italic text-2xl leading-none">A continent, on-chain</div>
                    <div className="mt-1 label-xs">From ancient masks to royal heritage</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  <span>X1 Mainnet</span>
                  <span>{config?.mint_price ?? "—"} XNT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER — running status band */}
      <section className="mt-16 border-y border-white/10 bg-background/40">
        <div className="mx-auto max-w-[1400px] px-6 py-8 sm:px-10">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
            <StatCell label="Status" value={status} accent={status === "Live" ? "cyan" : "gold"} />
            <StatCell label="Minted" value={minted.toLocaleString()} />
            <StatCell label="Remaining" value={remaining.toLocaleString()} accent="gold" />
            <StatCell label="Supply" value={maxSupply.toLocaleString()} />
            <StatCell label="Chain" value="X1" />
          </div>
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              <span>Genesis progress</span>
              <span>{progress.toFixed(1)}% subscribed</span>
            </div>
            <div className="h-[3px] w-full overflow-hidden bg-white/5">
              <div
                className="h-full bg-african-gold transition-all"
                style={{
                  width: `${Math.max(progress, 0.5)}%`,
                  boxShadow: "0 0 12px rgba(212,175,55,0.7)",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* STORY — Editorial feature */}
      <section id="story" className="mx-auto max-w-[1400px] px-6 py-24 sm:px-10">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-3">
            <div className="folio text-[80px]">02</div>
            <div className="label-xs">The Story</div>
            <div className="rule-gold mt-4 w-16" />
          </div>
          <div className="col-span-12 md:col-span-9">
            <h2 className="font-display text-4xl leading-[1.05] sm:text-6xl">
              History transformed
              <br />
              into <span className="serif-italic text-gradient-gold">ownership</span>.
            </h2>
            <div className="mt-8 columns-1 gap-10 text-[15px] leading-[1.75] text-muted-foreground md:columns-2">
              <p className="first-letter:mr-2 first-letter:float-left first-letter:font-display first-letter:text-6xl first-letter:leading-none first-letter:text-african-gold">
                This is not just digital art. This is the heartbeat of a continent that has inspired
                the world for thousands of years. Every NFT represents courage, resilience, unity,
                creativity and the rich diversity of Africa's people — from ancient masks to royal
                heritage, from tribal traditions to modern innovation.
              </p>
              <p className="mt-4">
                When you own an AFRICAN X1 NFT, you are not simply purchasing an asset. You are
                embracing a mission — saying{" "}
                <span className="serif-italic text-foreground">
                  "I believe Africa's story deserves to be preserved, celebrated and shared with the
                  world."
                </span>{" "}
                Built on the X1 Blockchain, this collection is a bridge between our past and our
                future.
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-4">
              {[
                { t: "Heritage", d: "Cultures & kingdoms preserved.", n: "i." },
                { t: "Ownership", d: "Guardianship, on-chain.", n: "ii." },
                { t: "Unity", d: "For every believer in culture.", n: "iii." },
                { t: "Legacy", d: "Written forever on X1.", n: "iv." },
              ].map((f) => (
                <div key={f.t} className="border-t border-white/15 pt-4">
                  <div className="serif-italic text-african-gold">{f.n}</div>
                  <div className="mt-2 font-display text-xl">{f.t}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{f.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ROADMAP — Timeline */}
      <section id="roadmap" className="border-t border-white/10 bg-background/30">
        <div className="mx-auto max-w-[1400px] px-6 py-24 sm:px-10">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 md:col-span-3">
              <div className="folio text-[80px]">03</div>
              <div className="label-xs">The Roadmap</div>
              <div className="rule-gold mt-4 w-16" />
            </div>
            <div className="col-span-12 md:col-span-9">
              <h2 className="font-display text-4xl leading-[1.05] sm:text-6xl">
                From <span className="serif-italic text-gradient-gold">genesis</span> to a<br />
                continental web3 ecosystem.
              </h2>
              <div className="mt-12 space-y-0">
                {ROADMAP.map((r, i) => (
                  <div
                    key={r.title}
                    className="group grid grid-cols-12 gap-4 border-t border-white/10 py-8 transition hover:bg-white/[0.02]"
                  >
                    <div className="col-span-2">
                      <div className="folio text-4xl text-african-gold/40">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                    </div>
                    <div className="col-span-10 md:col-span-6">
                      <div
                        className={`label-xs mb-2 ${r.status === "active" ? "text-african-gold" : r.status === "done" ? "text-cyber-cyan" : ""}`}
                      >
                        {r.phase} · {r.status}
                      </div>
                      <div className="font-display text-3xl">{r.title}</div>
                    </div>
                    <div className="col-span-12 text-[15px] leading-relaxed text-muted-foreground md:col-span-4">
                      {r.desc}
                    </div>
                  </div>
                ))}
                <div className="border-t border-white/10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-[1400px] px-6 py-24 sm:px-10">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-3">
            <div className="folio text-[80px]">04</div>
            <div className="label-xs">Frequently Asked</div>
            <div className="rule-gold mt-4 w-16" />
          </div>
          <div className="col-span-12 md:col-span-9">
            <h2 className="font-display text-4xl leading-[1.05] sm:text-6xl">
              Answers, <span className="serif-italic text-gradient-gold">plainly</span>.
            </h2>
            <div className="mt-10 space-y-0">
              {FAQ.map((q, i) => (
                <FaqItem key={q.q} q={q.q} a={q.a} n={i + 1} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "cyan" | "gold";
}) {
  return (
    <div>
      <div className="label-xs">{label}</div>
      <div
        className={`mt-2 font-display text-3xl leading-none ${accent === "gold" ? "text-african-gold" : accent === "cyan" ? "text-cyber-cyan" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function FaqItem({ q, a, n }: { q: string; a: string; n: number }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className="w-full border-t border-white/10 py-6 text-left transition last:border-b hover:bg-white/[0.02]"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-baseline gap-4">
          <span className="folio text-2xl text-african-gold/60">{String(n).padStart(2, "0")}</span>
          <span className="font-display text-2xl">{q}</span>
        </div>
        <ChevronDown
          size={18}
          className={`mt-2 shrink-0 text-african-gold transition ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <p className="ml-10 mt-4 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
          {a}
        </p>
      )}
    </button>
  );
}

const ROADMAP = [
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
] as const;

const FAQ = [
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
