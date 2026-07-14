import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";
import { NotFoundComponent } from "@/routes/__root";
import {
  Pause,
  Play,
  Eye,
  Settings,
  Users,
  Activity,
  Sliders,
  ScrollText,
  Upload,
  ImageIcon,
  FileJson,
  ExternalLink,
  Loader2,
  Store,
  Check,
  X,
  ShieldCheck,
  Star,
  BadgeDollarSign,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — AFRICAN X1 NFT" },
      { name: "description", content: "Operate the AFRICAN X1 NFT collection." },
    ],
  }),
  component: AdminPage,
});

type Section =
  | "overview"
  | "controls"
  | "config"
  | "whitelist"
  | "uploads"
  | "transactions"
  | "minted"
  | "marketplace";

function AdminPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>("overview");

  const { data: roleRow, isLoading: roleLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return data;
    },
  });
  const isAdmin = !!roleRow;

  const { data: config } = useQuery({
    enabled: isAdmin,
    queryKey: ["config"],
    queryFn: async () => {
      const { data } = await supabase.from("collection_config").select("*").eq("id", 1).single();
      return data;
    },
  });

  const { data: stats } = useQuery({
    enabled: isAdmin,
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [nfts, minted, txs, wl] = await Promise.all([
        supabase.from("nfts").select("*", { count: "exact", head: true }),
        supabase.from("nfts").select("*", { count: "exact", head: true }).eq("status", "minted"),
        supabase.from("transactions").select("*", { count: "exact", head: true }),
        supabase.from("whitelist").select("*", { count: "exact", head: true }),
      ]);
      return {
        totalNfts: nfts.count ?? 0,
        minted: minted.count ?? 0,
        txs: txs.count ?? 0,
        whitelist: wl.count ?? 0,
      };
    },
  });

  const { data: whitelist = [] } = useQuery({
    enabled: isAdmin,
    queryKey: ["whitelist"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whitelist")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: recentTx = [] } = useQuery({
    enabled: isAdmin,
    queryKey: ["recent-tx"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  // Not signed in: no route exists as far as the visitor is concerned.
  if (!loading && !user) {
    return <NotFoundComponent />;
  }

  // Signed in but still resolving role: brief neutral loading, no reveal either way.
  if (loading || roleLoading || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">Loading…</div>
    );
  }

  // Signed in, confirmed not an admin: still no route exists as far as they're concerned.
  if (!isAdmin) {
    return <NotFoundComponent />;
  }

  async function updateConfig(patch: Record<string, unknown>) {
    const { error } = await supabase
      .from("collection_config")
      .update(patch as never)
      .eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Config updated");
    qc.invalidateQueries({ queryKey: ["config"] });
  }

  const nav: { id: Section; label: string; num: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", num: "01", icon: <Activity size={14} /> },
    { id: "controls", label: "Mint Controls", num: "02", icon: <Sliders size={14} /> },
    { id: "config", label: "Configuration", num: "03", icon: <Settings size={14} /> },
    { id: "whitelist", label: "Whitelist", num: "04", icon: <Users size={14} /> },
    { id: "uploads", label: "Upload", num: "05", icon: <Upload size={14} /> },
    { id: "transactions", label: "Transactions", num: "06", icon: <ScrollText size={14} /> },
    { id: "minted", label: "Minted NFTs", num: "07", icon: <ImageIcon size={14} /> },
    { id: "marketplace", label: "Marketplace", num: "08", icon: <Store size={14} /> },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 sm:px-10">
      {/* Masthead */}
      <div className="grid grid-cols-12 items-end gap-6 border-b border-white/10 pb-8">
        <div className="col-span-12 md:col-span-8">
          <div className="eyebrow">Command Deck · Restricted</div>
          <h1 className="mt-3 font-display text-5xl leading-none sm:text-6xl">
            The <span className="serif-italic text-gradient-gold">Editor&apos;s</span> desk.
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            Operate the collection: pause the mint, revise configuration, curate the whitelist,
            upload artwork and metadata. All changes commit to the on-chain ledger.
          </p>
        </div>
        <div className="col-span-12 md:col-span-4">
          <div className="grid grid-cols-2 gap-4">
            <Kpi label="Supply" value={stats?.totalNfts ?? 0} />
            <Kpi label="Minted" value={stats?.minted ?? 0} accent />
            <Kpi label="Tx" value={stats?.txs ?? 0} />
            <Kpi label="Whitelist" value={stats?.whitelist ?? 0} />
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-12 gap-10">
        {/* Sidebar nav */}
        <aside className="col-span-12 md:col-span-3">
          <div className="label-xs mb-4">Sections</div>
          <nav className="space-y-0 border-t border-white/10">
            {nav.map((n) => {
              const active = section === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setSection(n.id)}
                  className={`group flex w-full items-baseline justify-between gap-3 border-b border-white/10 py-4 text-left transition ${
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-baseline gap-3">
                    <span className={`label-xs ${active ? "text-african-gold" : ""}`}>{n.num}</span>
                    <span className="font-display text-2xl leading-none">{n.label}</span>
                  </div>
                  {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-african-gold" />}
                </button>
              );
            })}
          </nav>
          {/* Recent transactions mini-feed */}
          <div className="mt-8 border border-white/10 p-4">
            <div className="label-xs mb-2 flex items-center gap-2">
              <ScrollText size={12} /> Recent Ledger
            </div>
            {recentTx.length === 0 ? (
              <div className="text-xs text-muted-foreground">No transactions yet.</div>
            ) : (
              <ul className="space-y-2 text-xs">
                {recentTx.map((t: Record<string, unknown>) => (
                  <li
                    key={t.id as string}
                    className="flex items-center justify-between gap-2 border-t border-white/5 pt-2 first:border-0 first:pt-0"
                  >
                    <span className="capitalize">{t.tx_type as string}</span>
                    <span
                      className={`serif-italic ${
                        t.status === "confirmed"
                          ? "text-cyber-cyan"
                          : t.status === "failed"
                            ? "text-destructive"
                            : "text-african-gold"
                      }`}
                    >
                      {t.status as string}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Main panel */}
        <main className="col-span-12 md:col-span-9">
          {section === "overview" && <OverviewPanel stats={stats} config={config} />}
          {section === "controls" && <ControlsPanel config={config} onUpdate={updateConfig} />}
          {section === "config" && <ConfigPanel config={config} onSave={updateConfig} />}
          {section === "whitelist" && (
            <WhitelistPanel
              rows={whitelist}
              userId={user.id}
              onChange={() => qc.invalidateQueries({ queryKey: ["whitelist"] })}
            />
          )}
          {section === "uploads" && (
            <UploadPanel
              config={config}
              onRefresh={() => {
                qc.invalidateQueries({ queryKey: ["config"] });
                qc.invalidateQueries({ queryKey: ["admin-stats"] });
              }}
            />
          )}
          {section === "transactions" && <TransactionsPanel />}
          {section === "minted" && <MintedPanel />}
          {section === "marketplace" && <MarketplacePanel />}
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── PANELS ── */

function PanelHeader({ n, kicker, title }: { n: string; kicker: string; title: string }) {
  return (
    <header className="mb-8 flex items-end justify-between gap-4 border-b border-white/10 pb-6">
      <div>
        <div className="label-xs">{kicker}</div>
        <h2 className="mt-2 font-display text-4xl leading-none">{title}</h2>
      </div>
      <div className="folio text-6xl">{n}</div>
    </header>
  );
}

function OverviewPanel({
  stats,
  config,
}: {
  stats: Record<string, number> | undefined;
  config: Record<string, unknown> | null | undefined;
}) {
  const supply = stats?.totalNfts ?? 0;
  const minted = stats?.minted ?? 0;
  const progress = supply ? (minted / supply) * 100 : 0;
  return (
    <div>
      <PanelHeader n="01" kicker="Section" title="Overview" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="border border-white/10 p-6">
          <div className="label-xs">Genesis Progress</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-6xl leading-none text-african-gold">{minted}</span>
            <span className="font-display text-2xl text-muted-foreground">/ {supply}</span>
          </div>
          <div className="mt-6 h-[3px] w-full bg-white/5">
            <div
              className="h-full bg-african-gold"
              style={{ width: `${Math.max(progress, 1)}%` }}
            />
          </div>
          <div className="mt-2 label-xs">{progress.toFixed(1)}% subscribed</div>
        </div>
        <div className="border border-white/10 p-6">
          <div className="label-xs">Current State</div>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-muted-foreground">Mint</span>
              <span
                className={`serif-italic ${config?.mint_paused ? "text-destructive" : "text-cyber-cyan"}`}
              >
                {config?.mint_paused ? "Paused" : "Live"}
              </span>
            </li>
            <li className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-muted-foreground">Access</span>
              <span className="serif-italic text-african-gold">
                {config?.whitelist_only ? "Whitelist only" : "Public"}
              </span>
            </li>
            <li className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-muted-foreground">Revealed</span>
              <span className="serif-italic">{config?.revealed ? "Yes" : "Not yet"}</span>
            </li>
            <li className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-muted-foreground">Price</span>
              <span className="serif-italic text-african-gold">
                {config?.mint_price != null ? `${config.mint_price} XNT` : "—"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Treasury</span>
              <span className="font-mono text-xs text-foreground truncate max-w-[180px]">
                {config?.treasury_wallet ? String(config.treasury_wallet) : "Not set"}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ControlsPanel({
  config,
  onUpdate,
}: {
  config: Record<string, unknown> | null | undefined;
  onUpdate: (p: Record<string, unknown>) => void;
}) {
  const items = [
    {
      k: "mint_paused",
      label: config?.mint_paused ? "Resume mint" : "Pause mint",
      desc: config?.mint_paused
        ? "Currently halted. Resume to accept new mints."
        : "Currently accepting mints. Pause immediately halts.",
      value: !!config?.mint_paused,
      icon: config?.mint_paused ? <Play size={14} /> : <Pause size={14} />,
    },
    {
      k: "whitelist_only",
      label: "Whitelist-only mode",
      desc: "Restrict minting to approved wallets only.",
      value: !!config?.whitelist_only,
      icon: <Users size={14} />,
    },
    {
      k: "revealed",
      label: "Reveal collection",
      desc: "Show real artwork instead of the pre-reveal placeholder. Irreversible once published.",
      value: !!config?.revealed,
      icon: <Eye size={14} />,
    },
  ];
  return (
    <div>
      <PanelHeader n="02" kicker="Section" title="Mint Controls" />
      <div className="divide-y divide-white/10 border-y border-white/10">
        {items.map((it) => (
          <button
            key={it.k}
            onClick={() => onUpdate({ [it.k]: !it.value })}
            className="group flex w-full items-center justify-between gap-6 py-6 text-left transition hover:bg-white/[0.02]"
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 text-african-gold">{it.icon}</div>
              <div>
                <div className="font-display text-2xl">{it.label}</div>
                <div className="mt-1 text-sm text-muted-foreground">{it.desc}</div>
              </div>
            </div>
            <Toggle on={it.value} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfigPanel({
  config,
  onSave,
}: {
  config: Record<string, unknown> | null | undefined;
  onSave: (p: Record<string, unknown>) => void;
}) {
  const [price, setPrice] = useState<number>(Number(config?.mint_price ?? 0));
  const [max, setMax] = useState<number>(Number(config?.max_per_wallet ?? 5));
  const [supply, setSupply] = useState<number>(Number(config?.max_supply ?? 50));
  const [treasury, setTreasury] = useState<string>(String(config?.treasury_wallet ?? ""));
  const [rpc, setRpc] = useState<string>(String(config?.rpc_url ?? ""));

  useEffect(() => {
    if (config) {
      setPrice(Number(config.mint_price));
      setMax(Number(config.max_per_wallet));
      setSupply(Number(config.max_supply));
      setTreasury(String(config.treasury_wallet ?? ""));
      setRpc(String(config.rpc_url ?? ""));
    }
  }, [config]);

  return (
    <div>
      <PanelHeader n="03" kicker="Section" title="Configuration" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            mint_price: price,
            max_per_wallet: max,
            max_supply: supply,
            treasury_wallet: treasury || null,
            rpc_url: rpc,
          });
        }}
        className="grid gap-8 md:grid-cols-2"
      >
        <Field
          label="Mint price (XNT)"
          value={price}
          onChange={(v: string) => setPrice(Number(v))}
          type="number"
          step="0.01"
        />
        <Field
          label="Max per wallet"
          value={max}
          onChange={(v: string) => setMax(Number(v))}
          type="number"
        />
        <Field
          label="Max supply"
          value={supply}
          onChange={(v: string) => setSupply(Number(v))}
          type="number"
        />
        <Field label="Treasury wallet" value={treasury} onChange={setTreasury} mono />
        <div className="md:col-span-2">
          <Field label="X1 RPC URL" value={rpc} onChange={setRpc} mono />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button className="rounded-sm bg-foreground px-6 py-3 font-display text-lg text-background transition hover:bg-african-gold">
            Save configuration
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
  mono,
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  mono?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="label-xs mb-2 block">{label}</span>
      <input
        type={type}
        step={step}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border-0 border-b border-white/15 bg-transparent py-2 text-lg focus:border-african-gold focus:outline-none focus:ring-0 ${mono ? "font-mono text-sm" : "font-display"}`}
      />
    </label>
  );
}

function WhitelistPanel({
  rows,
  userId,
  onChange,
}: {
  rows: Record<string, unknown>[];
  userId: string;
  onChange: () => void;
}) {
  const [wallet, setWallet] = useState("");
  const [note, setNote] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.trim()) return;
    const { error } = await supabase
      .from("whitelist")
      .insert({ wallet_address: wallet.trim(), added_by: userId, note: note || null });
    if (error) return toast.error(error.message);
    setWallet("");
    setNote("");
    toast.success("Added to whitelist");
    onChange();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("whitelist").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    onChange();
  }

  return (
    <div>
      <PanelHeader n="04" kicker="Section" title={`Whitelist · ${rows.length}`} />
      <form onSubmit={add} className="mb-8 grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="X1 wallet address"
          className="border-0 border-b border-white/15 bg-transparent py-2 font-mono text-sm focus:border-african-gold focus:outline-none"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note"
          className="border-0 border-b border-white/15 bg-transparent py-2 text-sm focus:border-african-gold focus:outline-none"
        />
        <button className="rounded-sm bg-foreground px-5 py-2.5 font-display text-lg text-background transition hover:bg-african-gold">
          Add
        </button>
      </form>
      <div className="border-t border-white/10">
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No whitelisted wallets yet.
          </div>
        ) : (
          rows.map((r, i) => (
            <div
              key={r.id as string}
              className="grid grid-cols-12 items-center gap-4 border-b border-white/10 py-4"
            >
              <div className="col-span-1 folio text-xl text-african-gold/50">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="col-span-6 truncate font-mono text-xs">
                {r.wallet_address as string}
              </div>
              <div className="col-span-3 truncate text-sm text-muted-foreground">
                {(r.note as string) ?? "—"}
              </div>
              <div className="col-span-1 text-xs text-muted-foreground">
                {new Date(r.created_at as string).toLocaleDateString()}
              </div>
              <div className="col-span-1 text-right">
                <button
                  onClick={() => remove(r.id as string)}
                  className="serif-italic text-sm text-destructive hover:underline"
                >
                  remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Upload Panel ── */
function UploadPanel({
  config,
  onRefresh,
}: {
  config: Record<string, unknown> | null | undefined;
  onRefresh: () => void;
}) {
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkUploading, setArtworkUploading] = useState(false);
  const artworkRef = useRef<HTMLInputElement>(null);

  const [metaFile, setMetaFile] = useState<File | null>(null);
  const [metaUploading, setMetaUploading] = useState(false);
  const [metaPreview, setMetaPreview] = useState<string | null>(null);
  const metaRef = useRef<HTMLInputElement>(null);

  async function uploadArtwork() {
    if (!artworkFile) return;
    setArtworkUploading(true);
    try {
      const ext = artworkFile.name.split(".").pop() ?? "jpg";
      const filename = `pre-reveal-${Date.now()}.${ext}`;
      const { data: storageData, error: storageErr } = await supabase.storage
        .from("collection")
        .upload(filename, artworkFile, { upsert: true });

      if (storageErr) {
        // If storage bucket doesn't exist yet, guide the admin
        if (
          storageErr.message.includes("Bucket not found") ||
          storageErr.message.includes("bucket")
        ) {
          toast.error(
            'Storage bucket "collection" not found. Create it in Supabase Dashboard → Storage.',
          );
        } else {
          toast.error(`Upload failed: ${storageErr.message}`);
        }
        return;
      }

      const { data: urlData } = supabase.storage.from("collection").getPublicUrl(storageData.path);
      const publicUrl = urlData.publicUrl;

      const { error: cfgErr } = await supabase
        .from("collection_config")
        .update({ pre_reveal_image_url: publicUrl })
        .eq("id", 1);

      if (cfgErr) {
        toast.error(cfgErr.message);
        return;
      }

      toast.success("Artwork uploaded and collection config updated");
      setArtworkFile(null);
      if (artworkRef.current) artworkRef.current.value = "";
      onRefresh();
    } finally {
      setArtworkUploading(false);
    }
  }

  async function uploadMetadata() {
    if (!metaFile) return;
    setMetaUploading(true);
    try {
      const text = await metaFile.text();
      let records: Array<{
        token_id: number;
        name?: string;
        description?: string;
        image_url?: string;
        rarity?: string;
        traits?: Record<string, unknown>;
      }>;
      try {
        records = JSON.parse(text);
      } catch {
        toast.error("Invalid JSON file. Expected an array of NFT objects.");
        return;
      }
      if (!Array.isArray(records) || records.length === 0) {
        toast.error("JSON must be a non-empty array of NFT objects.");
        return;
      }

      let updated = 0;
      let errors = 0;
      for (const r of records) {
        if (!r.token_id) continue;
        const patch: Record<string, unknown> = {};
        if (r.name) patch.name = r.name;
        if (r.description) patch.description = r.description;
        if (r.image_url) patch.image_url = r.image_url;
        if (r.rarity) patch.rarity = r.rarity;
        if (r.traits) patch.traits = r.traits;
        const { error } = await supabase
          .from("nfts")
          .update(patch as never)
          .eq("token_id", r.token_id);
        if (error) {
          errors++;
        } else {
          updated++;
        }
      }

      if (errors > 0) {
        toast.error(`${updated} updated, ${errors} failed. Check console for details.`);
      } else {
        toast.success(`${updated} NFT${updated !== 1 ? "s" : ""} updated successfully`);
      }
      setMetaFile(null);
      setMetaPreview(null);
      if (metaRef.current) metaRef.current.value = "";
      onRefresh();
    } finally {
      setMetaUploading(false);
    }
  }

  return (
    <div>
      <PanelHeader n="05" kicker="Section" title="Upload" />

      {/* Artwork upload */}
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <ImageIcon size={16} className="text-african-gold" />
          <h3 className="font-display text-2xl">Artwork</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Upload the pre-reveal or cover image. This image will be shown on the Collection page and
          during mint. Stored in Supabase Storage bucket{" "}
          <span className="font-mono text-xs">collection</span>.
        </p>
        {config?.pre_reveal_image_url != null && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-white/10 p-3 text-xs text-muted-foreground">
            <img
              src={String(config.pre_reveal_image_url)}
              alt="Current artwork"
              className="h-12 w-12 rounded object-cover"
            />
            <span className="truncate font-mono">{String(config.pre_reveal_image_url)}</span>
          </div>
        )}
        <div className="flex items-start gap-3">
          <input
            ref={artworkRef}
            type="file"
            accept="image/*"
            onChange={(e) => setArtworkFile(e.target.files?.[0] ?? null)}
            className="flex-1 rounded-lg border border-white/10 bg-transparent p-3 text-sm file:mr-4 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-foreground"
          />
          <button
            onClick={uploadArtwork}
            disabled={!artworkFile || artworkUploading}
            className="flex items-center gap-2 rounded-sm bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:bg-african-gold disabled:opacity-40"
          >
            {artworkUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            Upload
          </button>
        </div>
      </section>

      {/* Metadata upload */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <FileJson size={16} className="text-african-gold" />
          <h3 className="font-display text-2xl">Metadata</h3>
        </div>
        <p className="mb-2 text-sm text-muted-foreground">
          Upload a JSON file containing an array of NFT metadata objects. Each object must include
          <span className="font-mono text-xs"> token_id</span> plus any combination of{" "}
          <span className="font-mono text-xs">name, description, image_url, rarity, traits</span>.
        </p>
        <pre className="mb-4 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[11px] text-muted-foreground">
          {`[
  { "token_id": 1, "name": "AFRICAN X1 #001", "rarity": "legendary",
    "image_url": "https://...", "traits": { "tribe": "Zulu", "era": "Ancient" } },
  ...
]`}
        </pre>
        <div className="flex items-start gap-3">
          <input
            ref={metaRef}
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setMetaFile(f);
              if (f) {
                f.text().then((t) => {
                  try {
                    const arr = JSON.parse(t);
                    setMetaPreview(`${Array.isArray(arr) ? arr.length : "?"} records detected`);
                  } catch {
                    setMetaPreview("Invalid JSON");
                  }
                });
              } else {
                setMetaPreview(null);
              }
            }}
            className="flex-1 rounded-lg border border-white/10 bg-transparent p-3 text-sm file:mr-4 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-foreground"
          />
          <button
            onClick={uploadMetadata}
            disabled={!metaFile || metaUploading}
            className="flex items-center gap-2 rounded-sm bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:bg-african-gold disabled:opacity-40"
          >
            {metaUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Apply
          </button>
        </div>
        {metaPreview && (
          <p
            className={`mt-2 text-xs ${metaPreview.includes("Invalid") ? "text-destructive" : "text-cyber-cyan"}`}
          >
            {metaPreview}
          </p>
        )}
      </section>
    </div>
  );
}

/* ── Transactions Panel ── */
function TransactionsPanel() {
  const PAGE = 25;
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-txs", page],
    queryFn: async () => {
      const { data, count } = await supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / PAGE);

  return (
    <div>
      <PanelHeader n="06" kicker="Section" title={`Transactions · ${total.toLocaleString()}`} />
      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">
          <Loader2 size={24} className="mx-auto animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">No transactions yet.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Wallet</th>
                  <th className="pb-3 pr-4 text-right">Amount</th>
                  <th className="pb-3">Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((t: Record<string, unknown>) => (
                  <tr key={t.id as string} className="py-3 hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(t.created_at as string).toLocaleDateString()}{" "}
                      {new Date(t.created_at as string).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 pr-4 capitalize">{t.tx_type as string}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                          t.status === "confirmed"
                            ? "border-cyber-cyan/30 text-cyber-cyan"
                            : t.status === "failed"
                              ? "border-destructive/30 text-destructive"
                              : "border-african-gold/30 text-african-gold"
                        }`}
                      >
                        {t.status as string}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                      {String(t.wallet_address ?? "").slice(0, 8)}…
                      {String(t.wallet_address ?? "").slice(-4)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs">
                      {t.amount != null ? `${Number(t.amount).toFixed(4)} XNT` : "—"}
                    </td>
                    <td className="py-3">
                      {t.signature ? (
                        <a
                          href={`https://explorer.x1.xyz/tx/${t.signature}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 font-mono text-[11px] text-cyber-cyan hover:underline"
                        >
                          {String(t.signature).slice(0, 10)}…
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-sm border border-white/10 px-4 py-2 text-sm disabled:opacity-30"
              >
                ← Previous
              </button>
              <span className="text-muted-foreground">
                Page {page + 1} / {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                disabled={page >= pages - 1}
                className="rounded-sm border border-white/10 px-4 py-2 text-sm disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Minted NFTs Panel ── */
function MintedPanel() {
  const PAGE = 25;
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-minted", page],
    queryFn: async () => {
      const { data, count } = await supabase
        .from("nfts")
        .select("id, token_id, name, rarity, image_url, owner_wallet, minted_at, mint_signature", {
          count: "exact",
        })
        .eq("status", "minted")
        .order("minted_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / PAGE);

  const RARITY_COLOR: Record<string, string> = {
    legendary: "text-rarity-legendary",
    elite: "text-rarity-elite",
    rare: "text-rarity-rare",
    uncommon: "text-rarity-uncommon",
    common: "text-rarity-common",
  };

  return (
    <div>
      <PanelHeader n="07" kicker="Section" title={`Minted NFTs · ${total.toLocaleString()}`} />
      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">
          <Loader2 size={24} className="mx-auto animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">No NFTs minted yet.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Rarity</th>
                  <th className="pb-3 pr-4">Owner Wallet</th>
                  <th className="pb-3 pr-4">Minted</th>
                  <th className="pb-3">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((n: Record<string, unknown>) => (
                  <tr key={n.id as string} className="hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                      #{n.token_id as number}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        {n.image_url ? (
                          <img
                            src={n.image_url as string}
                            alt={n.name as string}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-white/5" />
                        )}
                        <span>{n.name as string}</span>
                      </div>
                    </td>
                    <td
                      className={`py-3 pr-4 capitalize text-xs font-medium ${RARITY_COLOR[n.rarity as string] ?? ""}`}
                    >
                      {n.rarity as string}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                      {n.owner_wallet
                        ? `${String(n.owner_wallet).slice(0, 8)}…${String(n.owner_wallet).slice(-4)}`
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                      {n.minted_at ? new Date(n.minted_at as string).toLocaleString() : "—"}
                    </td>
                    <td className="py-3">
                      {n.mint_signature ? (
                        <a
                          href={`https://explorer.x1.xyz/tx/${n.mint_signature}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 font-mono text-[11px] text-cyber-cyan hover:underline"
                        >
                          {String(n.mint_signature).slice(0, 8)}…
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-sm border border-white/10 px-4 py-2 text-sm disabled:opacity-30"
              >
                ← Previous
              </button>
              <span className="text-muted-foreground">
                Page {page + 1} / {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                disabled={page >= pages - 1}
                className="rounded-sm border border-white/10 px-4 py-2 text-sm disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Marketplace Panel ── */

type MarketSubTab = "applications" | "listings" | "collections" | "revenue";

function MarketplacePanel() {
  const [sub, setSub] = useState<MarketSubTab>("applications");
  const qc = useQueryClient();

  const subTabs: { id: MarketSubTab; label: string }[] = [
    { id: "applications", label: "Applications" },
    { id: "listings", label: "Listings" },
    { id: "collections", label: "Collections" },
    { id: "revenue", label: "Revenue" },
  ];

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-applications"] });
    qc.invalidateQueries({ queryKey: ["admin-listings"] });
    qc.invalidateQueries({ queryKey: ["admin-collections"] });
  }

  return (
    <div>
      <PanelHeader n="08" kicker="Section" title="Marketplace" />
      <div className="mb-8 flex flex-wrap gap-2">
        {subTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
              sub === t.id
                ? "border-african-gold/60 bg-african-gold/10 text-african-gold"
                : "border-white/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "applications" && <ApplicationsAdmin onChange={invalidate} />}
      {sub === "listings" && <ListingsAdmin onChange={invalidate} />}
      {sub === "collections" && <CollectionsAdmin onChange={invalidate} />}
      {sub === "revenue" && <RevenueAdmin />}
    </div>
  );
}

function ApplicationsAdmin({ onChange }: { onChange: () => void }) {
  const { data: apps = [], refetch } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approve(id: string) {
    setBusyId(id);
    try {
      const { adminApproveApplication } = await import("@/lib/marketplace.functions");
      await adminApproveApplication({ data: { applicationId: id } });
      toast.success("Application approved — collection is now live");
      refetch();
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      const { adminRejectApplication } = await import("@/lib/marketplace.functions");
      await adminRejectApplication({ data: { applicationId: id } });
      toast.success("Application rejected");
      refetch();
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setBusyId(null);
    }
  }

  const pending = apps.filter((a) => a.status === "pending");
  const reviewed = apps.filter((a) => a.status !== "pending");

  return (
    <div>
      <div className="label-xs mb-3">Pending review · {pending.length}</div>
      {pending.length === 0 ? (
        <div className="border border-white/10 p-6 text-sm text-muted-foreground">
          No pending applications.
        </div>
      ) : (
        <div className="divide-y divide-white/10 border-y border-white/10">
          {pending.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-display text-xl">{a.collection_name}</div>
                <div className="text-sm text-muted-foreground">by {a.project_name}</div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {a.creator_wallet}
                </div>
                {a.website && (
                  <a
                    href={a.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-cyber-cyan hover:underline"
                  >
                    Website <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => approve(a.id)}
                  disabled={busyId === a.id}
                  className="inline-flex items-center gap-1 rounded-sm border border-cyber-cyan/40 bg-cyber-cyan/10 px-3 py-2 text-xs font-semibold text-cyber-cyan hover:bg-cyber-cyan/20 disabled:opacity-50"
                >
                  <Check size={12} /> Approve
                </button>
                <button
                  onClick={() => reject(a.id)}
                  disabled={busyId === a.id}
                  className="inline-flex items-center gap-1 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                >
                  <X size={12} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="label-xs mb-3 mt-10">History</div>
      {reviewed.length === 0 ? (
        <div className="text-sm text-muted-foreground">No reviewed applications yet.</div>
      ) : (
        <div className="space-y-2">
          {reviewed.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between border-b border-white/5 py-2 text-sm"
            >
              <span>{a.collection_name}</span>
              <span
                className={`serif-italic ${a.status === "approved" ? "text-cyber-cyan" : "text-destructive"}`}
              >
                {a.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ListingsAdmin({ onChange }: { onChange: () => void }) {
  const { data: listings = [], refetch } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*, nfts(name, token_id, image_url)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(id: string, remove: boolean) {
    setBusyId(id);
    try {
      const { adminRemoveListing, adminRestoreListing } =
        await import("@/lib/marketplace.functions");
      if (remove) await adminRemoveListing({ data: { listingId: id } });
      else await adminRestoreListing({ data: { listingId: id } });
      toast.success(remove ? "Listing removed" : "Listing restored");
      refetch();
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="divide-y divide-white/10 border-y border-white/10">
      {listings.length === 0 ? (
        <div className="py-6 text-sm text-muted-foreground">No listings yet.</div>
      ) : (
        listings.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <img
                src={l.nfts?.image_url || "/pre-reveal.jpg"}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
              <div>
                <div className="text-sm font-medium">{l.nfts?.name}</div>
                <div className="font-mono text-xs text-muted-foreground">{l.price} XNT</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`serif-italic text-xs ${
                  l.status === "active"
                    ? "text-cyber-cyan"
                    : l.status === "removed"
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              >
                {l.status}
              </span>
              {l.status === "active" ? (
                <button
                  onClick={() => toggle(l.id, true)}
                  disabled={busyId === l.id}
                  className="rounded-sm border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  Remove
                </button>
              ) : (
                (l.status === "removed" || l.status === "cancelled") && (
                  <button
                    onClick={() => toggle(l.id, false)}
                    disabled={busyId === l.id}
                    className="rounded-sm border border-cyber-cyan/40 px-3 py-1.5 text-xs text-cyber-cyan hover:bg-cyber-cyan/10 disabled:opacity-50"
                  >
                    Restore
                  </button>
                )
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CollectionsAdmin({ onChange }: { onChange: () => void }) {
  const { data: collections = [], refetch } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .order("is_official", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setFlags(id: string, patch: Record<string, unknown>) {
    setBusyId(id);
    try {
      const { adminSetCollectionFlags } = await import("@/lib/marketplace.functions");
      await adminSetCollectionFlags({ data: { collectionId: id, ...patch } });
      toast.success("Collection updated");
      refetch();
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="divide-y divide-white/10 border-y border-white/10">
      {collections.map((c) => (
        <div
          key={c.id}
          className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg">{c.collection_name}</span>
              {c.is_official && (
                <span className="rounded-full bg-african-gold/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-african-gold">
                  Official
                </span>
              )}
              <span
                className={`serif-italic text-xs ${c.status === "active" ? "text-cyber-cyan" : "text-destructive"}`}
              >
                {c.status}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">by {c.project_name}</div>
          </div>
          {!c.is_official && (
            <div className="flex gap-2">
              <button
                onClick={() => setFlags(c.id, { verified: !c.verified })}
                disabled={busyId === c.id}
                className={`inline-flex items-center gap-1 rounded-sm border px-3 py-1.5 text-xs disabled:opacity-50 ${
                  c.verified
                    ? "border-cyber-cyan/50 bg-cyber-cyan/10 text-cyber-cyan"
                    : "border-white/15 text-muted-foreground"
                }`}
              >
                <ShieldCheck size={12} /> {c.verified ? "Verified" : "Verify"}
              </button>
              <button
                onClick={() => setFlags(c.id, { featured: !c.featured })}
                disabled={busyId === c.id}
                className={`inline-flex items-center gap-1 rounded-sm border px-3 py-1.5 text-xs disabled:opacity-50 ${
                  c.featured
                    ? "border-african-gold/50 bg-african-gold/10 text-african-gold"
                    : "border-white/15 text-muted-foreground"
                }`}
              >
                <Star size={12} /> {c.featured ? "Featured" : "Feature"}
              </button>
              <button
                onClick={() =>
                  setFlags(c.id, { status: c.status === "active" ? "suspended" : "active" })
                }
                disabled={busyId === c.id}
                className={`rounded-sm border px-3 py-1.5 text-xs disabled:opacity-50 ${
                  c.status === "active"
                    ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                    : "border-cyber-cyan/40 text-cyber-cyan hover:bg-cyber-cyan/10"
                }`}
              >
                {c.status === "active" ? "Suspend" : "Reinstate"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RevenueAdmin() {
  const { data } = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: async () => {
      const [sales, apps] = await Promise.all([
        supabase.from("sales").select("price, platform_fee_amount").eq("status", "confirmed"),
        supabase
          .from("collection_applications")
          .select("listing_fee_amount")
          .eq("status", "approved"),
      ]);
      const salesRows = sales.data ?? [];
      const appRows = apps.data ?? [];
      const totalVolume = salesRows.reduce((s, r) => s + Number(r.price), 0);
      const saleFees = salesRows.reduce((s, r) => s + Number(r.platform_fee_amount), 0);
      const appFees = appRows.reduce((s, r) => s + Number(r.listing_fee_amount ?? 0), 0);
      return {
        totalVolume,
        saleFees,
        appFees,
        totalRevenue: saleFees + appFees,
        salesCount: salesRows.length,
      };
    },
  });

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="border border-white/10 p-6">
        <div className="label-xs flex items-center gap-2">
          <BadgeDollarSign size={12} /> Total sales volume
        </div>
        <div className="mt-3 font-display text-4xl text-african-gold">
          {(data?.totalVolume ?? 0).toFixed(3)} XNT
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {data?.salesCount ?? 0} confirmed sales
        </div>
      </div>
      <div className="border border-white/10 p-6">
        <div className="label-xs">Platform fee revenue</div>
        <div className="mt-3 font-display text-4xl">{(data?.saleFees ?? 0).toFixed(3)} XNT</div>
        <div className="mt-1 text-xs text-muted-foreground">3% of settled sales</div>
      </div>
      <div className="border border-white/10 p-6">
        <div className="label-xs">Application fee revenue</div>
        <div className="mt-3 font-display text-4xl">{(data?.appFees ?? 0).toFixed(3)} XNT</div>
        <div className="mt-1 text-xs text-muted-foreground">Approved community listings</div>
      </div>
      <div className="border border-african-gold/30 bg-african-gold/5 p-6">
        <div className="label-xs text-african-gold">Total marketplace revenue</div>
        <div className="mt-3 font-display text-4xl text-african-gold">
          {(data?.totalRevenue ?? 0).toFixed(3)} XNT
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── SHARED WIDGETS ── */

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        on ? "bg-african-gold" : "bg-white/10"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-background transition ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </span>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="border-t border-white/15 pt-3">
      <div className="label-xs">{label}</div>
      <div
        className={`mt-1 font-display text-3xl leading-none ${accent ? "text-african-gold" : ""}`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}
