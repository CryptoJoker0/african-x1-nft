import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";
import {
  Pause, Play, Eye, Settings, Users, Activity, ShieldAlert, Sliders,
  ScrollText, Image as ImageIcon, Store, Bot, FileClock, UserCog,
} from "lucide-react";
import {
  createNft, updateNft, deleteNft, createArtworkUploadUrl, listAllNfts,
} from "@/lib/nft.functions";
import {
  adminListAllListings, adminListSales, adminCancelListing,
} from "@/lib/marketplace.functions";
import {
  getAiSettings, setAiProvider, testAiConnection,
} from "@/lib/ai-settings.functions";
import {
  listAdminUsers, setUserRole, listAuditLogs,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — AFRICAN X1 NFT" },
      { name: "description", content: "Operate the AFRICAN X1 NFT collection." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

type Section =
  | "overview" | "controls" | "config" | "whitelist"
  | "nfts" | "marketplace" | "ai" | "users" | "audit";

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>("overview");

  const { data: roleRow, isLoading: roleLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
      return data;
    },
  });
  const isAdmin = !!roleRow;

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

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
      const { data } = await supabase.from("whitelist").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: recentTx = [] } = useQuery({
    enabled: isAdmin,
    queryKey: ["recent-tx"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(6);
      return data ?? [];
    },
  });

  if (loading || roleLoading || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">Verifying admin access…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert size={40} className="mx-auto text-destructive" />
        <h1 className="mt-4 font-display text-3xl">Restricted area</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your account doesn't have admin privileges. Ask a collection admin to grant your account the <span className="font-mono text-african-gold">admin</span> role.
        </p>
        <Link to="/dashboard" className="mt-6 inline-flex rounded-sm border border-white/15 px-4 py-2 text-sm">Back to dashboard</Link>
      </div>
    );
  }

  async function updateConfig(patch: Record<string, unknown>) {
    const { error } = await supabase.from("collection_config").update(patch as never).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Config updated");
    qc.invalidateQueries({ queryKey: ["config"] });
  }

  const nav: { id: Section; label: string; num: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", num: "01", icon: <Activity size={14} /> },
    { id: "controls", label: "Mint controls", num: "02", icon: <Sliders size={14} /> },
    { id: "config", label: "Configuration", num: "03", icon: <Settings size={14} /> },
    { id: "whitelist", label: "Whitelist", num: "04", icon: <Users size={14} /> },
    { id: "nfts", label: "NFTs", num: "05", icon: <ImageIcon size={14} /> },
    { id: "marketplace", label: "Marketplace", num: "06", icon: <Store size={14} /> },
    { id: "ai", label: "AI Settings", num: "07", icon: <Bot size={14} /> },
    { id: "users", label: "Users", num: "08", icon: <UserCog size={14} /> },
    { id: "audit", label: "Audit Log", num: "09", icon: <FileClock size={14} /> },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 sm:px-10">
      <div className="grid grid-cols-12 items-end gap-6 border-b border-white/10 pb-8">
        <div className="col-span-12 md:col-span-8">
          <div className="eyebrow">Command Deck · Restricted</div>
          <h1 className="mt-3 font-display text-5xl leading-none sm:text-6xl">
            The <span className="serif-italic text-gradient-gold">Editor's</span> desk.
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            Operate the collection: pause the mint, revise configuration, curate the whitelist, manage NFTs, marketplace and AI providers.
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
          <div className="mt-8 border border-white/10 p-4">
            <div className="label-xs mb-2 flex items-center gap-2"><ScrollText size={12} /> Recent Ledger</div>
            {recentTx.length === 0 ? (
              <div className="text-xs text-muted-foreground">No transactions yet.</div>
            ) : (
              <ul className="space-y-2 text-xs">
                {recentTx.map((t: any) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 border-t border-white/5 pt-2 first:border-0 first:pt-0">
                    <span className="capitalize">{t.tx_type}</span>
                    <span className={`serif-italic ${t.status === "confirmed" ? "text-cyber-cyan" : t.status === "failed" ? "text-destructive" : "text-african-gold"}`}>{t.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main className="col-span-12 md:col-span-9">
          {section === "overview" && <OverviewPanel stats={stats} config={config} />}
          {section === "controls" && <ControlsPanel config={config} onUpdate={updateConfig} />}
          {section === "config" && <ConfigPanel config={config} onSave={updateConfig} />}
          {section === "whitelist" && (
            <WhitelistPanel rows={whitelist} userId={user.id} onChange={() => qc.invalidateQueries({ queryKey: ["whitelist"] })} />
          )}
          {section === "nfts" && <NftsPanel />}
          {section === "marketplace" && <MarketplacePanel config={config} onUpdate={updateConfig} />}
          {section === "ai" && <AiPanel />}
          {section === "users" && <UsersPanel />}
          {section === "audit" && <AuditPanel />}
        </main>
      </div>
    </div>
  );
}

/* -------------------- SHARED -------------------- */

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

function Field({ label, value, onChange, type = "text", step, mono, placeholder }: any) {
  return (
    <label className="block">
      <span className="label-xs mb-2 block">{label}</span>
      <input
        type={type} step={step} value={value ?? ""} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border-0 border-b border-white/15 bg-transparent py-2 text-lg focus:border-african-gold focus:outline-none focus:ring-0 ${mono ? "font-mono text-sm" : "font-display"}`}
      />
    </label>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${on ? "bg-african-gold" : "bg-white/10"}`}>
      <span className={`inline-block h-5 w-5 transform rounded-full bg-background transition ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </span>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="border-t border-white/15 pt-3">
      <div className="label-xs">{label}</div>
      <div className={`mt-1 font-display text-3xl leading-none ${accent ? "text-african-gold" : ""}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

/* -------------------- ORIGINAL PANELS -------------------- */

function OverviewPanel({ stats, config }: any) {
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
            <div className="h-full bg-african-gold" style={{ width: `${Math.max(progress, 1)}%` }} />
          </div>
          <div className="mt-2 label-xs">{progress.toFixed(1)}% subscribed</div>
        </div>
        <div className="border border-white/10 p-6">
          <div className="label-xs">Current State</div>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-muted-foreground">Mint</span>
              <span className={`serif-italic ${config?.mint_paused ? "text-destructive" : "text-cyber-cyan"}`}>
                {config?.mint_paused ? "Paused" : "Live"}
              </span>
            </li>
            <li className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-muted-foreground">Access</span>
              <span className="serif-italic text-african-gold">{config?.whitelist_only ? "Whitelist only" : "Public"}</span>
            </li>
            <li className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-muted-foreground">Marketplace</span>
              <span className={`serif-italic ${config?.marketplace_enabled ? "text-cyber-cyan" : "text-destructive"}`}>
                {config?.marketplace_enabled ? "Open" : "Closed"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="serif-italic text-african-gold">{config?.mint_price ?? "—"} XNT</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ControlsPanel({ config, onUpdate }: any) {
  const items = [
    {
      k: "mint_paused",
      label: config?.mint_paused ? "Resume mint" : "Pause mint",
      desc: config?.mint_paused ? "Currently halted. Resume to accept new mints." : "Currently accepting mints. Pause immediately halts.",
      value: !!config?.mint_paused,
      icon: config?.mint_paused ? <Play size={14} /> : <Pause size={14} />,
    },
    { k: "whitelist_only", label: "Whitelist-only mode", desc: "Restrict minting to approved wallets only.", value: !!config?.whitelist_only, icon: <Users size={14} /> },
    { k: "revealed", label: "Reveal collection", desc: "Show real artwork instead of the pre-reveal placeholder.", value: !!config?.revealed, icon: <Eye size={14} /> },
  ];
  return (
    <div>
      <PanelHeader n="02" kicker="Section" title="Mint Controls" />
      <div className="divide-y divide-white/10 border-y border-white/10">
        {items.map((it) => (
          <button key={it.k} onClick={() => onUpdate({ [it.k]: !it.value })} className="group flex w-full items-center justify-between gap-6 py-6 text-left transition hover:bg-white/[0.02]">
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

function ConfigPanel({ config, onSave }: any) {
  const [price, setPrice] = useState<number>(config?.mint_price ?? 0);
  const [max, setMax] = useState<number>(config?.max_per_wallet ?? 5);
  const [supply, setSupply] = useState<number>(config?.max_supply ?? 50);
  const [treasury, setTreasury] = useState<string>(config?.treasury_wallet ?? "");
  const [rpc, setRpc] = useState<string>(config?.rpc_url ?? "");
  const [program, setProgram] = useState<string>(config?.program_id ?? "");

  useEffect(() => {
    if (config) {
      setPrice(config.mint_price); setMax(config.max_per_wallet); setSupply(config.max_supply);
      setTreasury(config.treasury_wallet ?? ""); setRpc(config.rpc_url ?? ""); setProgram(config.program_id ?? "");
    }
  }, [config]);

  return (
    <div>
      <PanelHeader n="03" kicker="Section" title="Configuration" />
      <form
        onSubmit={(e) => { e.preventDefault(); onSave({ mint_price: price, max_per_wallet: max, max_supply: supply, treasury_wallet: treasury || null, rpc_url: rpc, program_id: program || null }); }}
        className="grid gap-8 md:grid-cols-2"
      >
        <Field label="Mint price (XNT)" value={price} onChange={(v: string) => setPrice(Number(v))} type="number" step="0.01" />
        <Field label="Max per wallet" value={max} onChange={(v: string) => setMax(Number(v))} type="number" />
        <Field label="Max supply" value={supply} onChange={(v: string) => setSupply(Number(v))} type="number" />
        <Field label="Treasury wallet" value={treasury} onChange={setTreasury} mono />
        <div className="md:col-span-2"><Field label="X1 RPC URL" value={rpc} onChange={setRpc} mono /></div>
        <div className="md:col-span-2"><Field label="Program ID" value={program} onChange={setProgram} mono placeholder="Deploy your Anchor program, then paste here" /></div>
        <div className="md:col-span-2 flex justify-end">
          <button className="rounded-sm bg-foreground px-6 py-3 font-display text-lg text-background transition hover:bg-african-gold">Save configuration</button>
        </div>
      </form>
    </div>
  );
}

function WhitelistPanel({ rows, userId, onChange }: { rows: any[]; userId: string; onChange: () => void }) {
  const [wallet, setWallet] = useState("");
  const [note, setNote] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.trim()) return;
    const { error } = await supabase.from("whitelist").insert({ wallet_address: wallet.trim(), added_by: userId, note: note || null });
    if (error) return toast.error(error.message);
    setWallet(""); setNote("");
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
        <input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="X1 wallet address" className="border-0 border-b border-white/15 bg-transparent py-2 font-mono text-sm focus:border-african-gold focus:outline-none" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className="border-0 border-b border-white/15 bg-transparent py-2 text-sm focus:border-african-gold focus:outline-none" />
        <button className="rounded-sm bg-foreground px-5 py-2.5 font-display text-lg text-background transition hover:bg-african-gold">Add</button>
      </form>
      <div className="border-t border-white/10">
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No whitelisted wallets yet.</div>
        ) : (
          rows.map((r, i) => (
            <div key={r.id} className="grid grid-cols-12 items-center gap-4 border-b border-white/10 py-4">
              <div className="col-span-1 folio text-xl text-african-gold/50">{String(i + 1).padStart(2, "0")}</div>
              <div className="col-span-6 truncate font-mono text-xs">{r.wallet_address}</div>
              <div className="col-span-3 truncate text-sm text-muted-foreground">{r.note ?? "—"}</div>
              <div className="col-span-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
              <div className="col-span-1 text-right">
                <button onClick={() => remove(r.id)} className="serif-italic text-sm text-destructive hover:underline">remove</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------- NEW: NFTS -------------------- */

function NftsPanel() {
  const qc = useQueryClient();
  const list = useServerFn(listAllNfts);
  const create = useServerFn(createNft);
  const update = useServerFn(updateNft);
  const remove = useServerFn(deleteNft);
  const uploadUrl = useServerFn(createArtworkUploadUrl);

  const { data: nfts = [], isLoading } = useQuery({
    queryKey: ["admin-nfts"],
    queryFn: () => list(),
  });

  const [form, setForm] = useState({
    name: "", token_id: 0, description: "", image_url: "",
    metadata_uri: "", rarity: "common" as const, is_featured: false,
  });
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const res = await uploadUrl({ data: { filename: safeName, contentType: file.type || "application/octet-stream" } });
      const put = await fetch(res.signedUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
      setForm((f) => ({ ...f, image_url: res.publicUrl }));
      toast.success("Artwork uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setUploading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create({ data: {
        name: form.name, token_id: Number(form.token_id),
        description: form.description || null,
        image_url: form.image_url || null,
        metadata_uri: form.metadata_uri || null,
        rarity: form.rarity, is_featured: form.is_featured,
        traits: {},
      }});
      toast.success("NFT created");
      setForm({ name: "", token_id: 0, description: "", image_url: "", metadata_uri: "", rarity: "common", is_featured: false });
      qc.invalidateQueries({ queryKey: ["admin-nfts"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e: any) { toast.error(e.message); }
  }

  async function toggleFeatured(id: string, current: boolean) {
    try {
      await update({ data: { id, patch: { is_featured: !current } } });
      qc.invalidateQueries({ queryKey: ["admin-nfts"] });
    } catch (e: any) { toast.error(e.message); }
  }

  async function del(id: string) {
    if (!confirm("Delete this NFT?")) return;
    try {
      await remove({ data: { id } });
      qc.invalidateQueries({ queryKey: ["admin-nfts"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Deleted");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div>
      <PanelHeader n="05" kicker="Section" title={`NFTs · ${nfts.length}`} />

      <form onSubmit={submit} className="mb-10 grid gap-6 border border-white/10 p-6 md:grid-cols-2">
        <Field label="Name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
        <Field label="Token ID" type="number" value={form.token_id} onChange={(v: string) => setForm({ ...form, token_id: Number(v) })} />
        <div className="md:col-span-2"><Field label="Description" value={form.description} onChange={(v: string) => setForm({ ...form, description: v })} /></div>
        <Field label="Image URL" value={form.image_url} onChange={(v: string) => setForm({ ...form, image_url: v })} mono />
        <Field label="Metadata URI" value={form.metadata_uri} onChange={(v: string) => setForm({ ...form, metadata_uri: v })} mono />
        <label className="block">
          <span className="label-xs mb-2 block">Rarity</span>
          <select value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value as any })}
            className="w-full border-0 border-b border-white/15 bg-transparent py-2 font-display text-lg focus:border-african-gold focus:outline-none">
            {["legendary","elite","rare","uncommon","common"].map((r) => <option key={r} value={r} className="bg-background">{r}</option>)}
          </select>
        </label>
        <label className="flex items-end gap-3">
          <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="h-4 w-4" />
          <span className="label-xs">Featured</span>
        </label>
        <div className="md:col-span-2">
          <div className="label-xs mb-2">Upload artwork</div>
          <input type="file" accept="image/*" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            className="text-sm text-muted-foreground file:mr-4 file:rounded-sm file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-foreground hover:file:bg-white/20" />
          {uploading && <div className="mt-2 text-xs text-muted-foreground">Uploading…</div>}
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button className="rounded-sm bg-foreground px-6 py-3 font-display text-lg text-background transition hover:bg-african-gold">Create NFT</button>
        </div>
      </form>

      <div className="border-t border-white/10">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : nfts.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No NFTs yet.</div>
        ) : nfts.map((n: any, i: number) => (
          <div key={n.id} className="grid grid-cols-12 items-center gap-4 border-b border-white/10 py-4">
            <div className="col-span-1 folio text-xl text-african-gold/50">{String(i + 1).padStart(2, "0")}</div>
            <div className="col-span-1">
              {n.image_url ? <img src={n.image_url} alt="" className="h-10 w-10 object-cover" /> : <div className="h-10 w-10 bg-white/5" />}
            </div>
            <div className="col-span-3 truncate font-display text-lg">{n.name}</div>
            <div className="col-span-1 font-mono text-xs">#{n.token_id}</div>
            <div className="col-span-2 serif-italic text-sm text-african-gold">{n.rarity}</div>
            <div className="col-span-2 text-xs text-muted-foreground capitalize">{n.status}</div>
            <div className="col-span-1">
              <button onClick={() => toggleFeatured(n.id, n.is_featured)} className={`text-xs serif-italic ${n.is_featured ? "text-african-gold" : "text-muted-foreground hover:text-foreground"}`}>
                {n.is_featured ? "featured" : "feature"}
              </button>
            </div>
            <div className="col-span-1 text-right">
              <button onClick={() => del(n.id)} className="serif-italic text-sm text-destructive hover:underline">delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------- NEW: MARKETPLACE -------------------- */

function MarketplacePanel({ config, onUpdate }: any) {
  const qc = useQueryClient();
  const listListings = useServerFn(adminListAllListings);
  const listSalesFn = useServerFn(adminListSales);
  const cancel = useServerFn(adminCancelListing);

  const { data: listings = [] } = useQuery({ queryKey: ["admin-listings"], queryFn: () => listListings() });
  const { data: sales = [] } = useQuery({ queryKey: ["admin-sales"], queryFn: () => listSalesFn() });

  const [royaltyBps, setRoyaltyBps] = useState<number>(config?.royalty_bps ?? 500);
  const [feeBps, setFeeBps] = useState<number>(config?.platform_fee_bps ?? 250);
  const [feeWallet, setFeeWallet] = useState<string>(config?.fee_wallet ?? "");

  useEffect(() => {
    if (config) {
      setRoyaltyBps(config.royalty_bps ?? 500);
      setFeeBps(config.platform_fee_bps ?? 250);
      setFeeWallet(config.fee_wallet ?? "");
    }
  }, [config]);

  async function doCancel(id: string) {
    try {
      await cancel({ data: { listingId: id } });
      qc.invalidateQueries({ queryKey: ["admin-listings"] });
      toast.success("Listing cancelled");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div>
      <PanelHeader n="06" kicker="Section" title="Marketplace" />

      <button onClick={() => onUpdate({ marketplace_enabled: !config?.marketplace_enabled })}
        className="mb-6 flex w-full items-center justify-between border border-white/10 p-6 text-left transition hover:bg-white/[0.02]">
        <div>
          <div className="font-display text-2xl">{config?.marketplace_enabled ? "Marketplace open" : "Marketplace closed"}</div>
          <div className="mt-1 text-sm text-muted-foreground">Toggle to allow or block secondary sales sitewide.</div>
        </div>
        <Toggle on={!!config?.marketplace_enabled} />
      </button>

      <form
        onSubmit={(e) => { e.preventDefault(); onUpdate({ royalty_bps: royaltyBps, platform_fee_bps: feeBps, fee_wallet: feeWallet || null }); }}
        className="mb-10 grid gap-6 border border-white/10 p-6 md:grid-cols-3"
      >
        <Field label="Creator royalty (bps)" type="number" value={royaltyBps} onChange={(v: string) => setRoyaltyBps(Number(v))} />
        <Field label="Platform fee (bps)" type="number" value={feeBps} onChange={(v: string) => setFeeBps(Number(v))} />
        <Field label="Fee wallet" value={feeWallet} onChange={setFeeWallet} mono />
        <div className="md:col-span-3 flex justify-between text-xs text-muted-foreground">
          <span>100 bps = 1%. Current split: seller {((10000 - royaltyBps - feeBps) / 100).toFixed(2)}% · royalty {(royaltyBps / 100).toFixed(2)}% · platform {(feeBps / 100).toFixed(2)}%.</span>
          <button className="rounded-sm bg-foreground px-4 py-2 font-display text-sm text-background hover:bg-african-gold">Save</button>
        </div>
      </form>

      <div className="mb-10">
        <div className="label-xs mb-3">Active listings · {listings.filter((l: any) => l.status === "active").length}</div>
        <div className="border-t border-white/10">
          {listings.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No listings.</div>
          ) : listings.map((l: any) => (
            <div key={l.id} className="grid grid-cols-12 items-center gap-4 border-b border-white/10 py-4">
              <div className="col-span-4 font-display text-lg">{l.nfts?.name ?? "—"}</div>
              <div className="col-span-2 font-mono text-xs">#{l.nfts?.token_id ?? "?"}</div>
              <div className="col-span-2 serif-italic text-african-gold">{l.price} XNT</div>
              <div className="col-span-2 text-xs text-muted-foreground capitalize">{l.status}</div>
              <div className="col-span-2 text-right">
                {l.status === "active" && (
                  <button onClick={() => doCancel(l.id)} className="serif-italic text-sm text-destructive hover:underline">cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="label-xs mb-3">Sales history · {sales.length}</div>
        <div className="border-t border-white/10">
          {sales.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No sales yet.</div>
          ) : sales.map((s: any) => (
            <div key={s.id} className="grid grid-cols-12 items-center gap-4 border-b border-white/10 py-3 text-sm">
              <div className="col-span-3 truncate">{s.nfts?.name ?? "—"}</div>
              <div className="col-span-2 serif-italic text-african-gold">{Number(s.price).toFixed(2)}</div>
              <div className="col-span-2 text-xs text-muted-foreground">royalty {Number(s.royalty_amount).toFixed(2)}</div>
              <div className="col-span-2 text-xs text-muted-foreground">fee {Number(s.platform_fee_amount).toFixed(2)}</div>
              <div className="col-span-2 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</div>
              <div className="col-span-1 serif-italic text-xs capitalize">{s.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------- NEW: AI SETTINGS -------------------- */

function AiPanel() {
  const qc = useQueryClient();
  const getFn = useServerFn(getAiSettings);
  const setFn = useServerFn(setAiProvider);
  const testFn = useServerFn(testAiConnection);

  const { data } = useQuery({ queryKey: ["ai-settings"], queryFn: () => getFn() });
  const [testing, setTesting] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, { ok: boolean; error?: string | null }>>({});

  const providers: { id: "lovable" | "openai" | "anthropic"; label: string; desc: string; keyName: string; present: boolean }[] = [
    { id: "lovable", label: "Lovable AI Gateway", desc: "Default. GPT, Claude, Gemini available. No API key required.", keyName: "LOVABLE_API_KEY", present: !!data?.lovableKeyPresent },
    { id: "openai", label: "OpenAI (BYO key)", desc: "Use your own OpenAI account and billing.", keyName: "OPENAI_API_KEY", present: !!data?.openaiKeyPresent },
    { id: "anthropic", label: "Anthropic (BYO key)", desc: "Use your own Anthropic account and billing.", keyName: "ANTHROPIC_API_KEY", present: !!data?.anthropicKeyPresent },
  ];

  async function select(p: "lovable" | "openai" | "anthropic") {
    try {
      await setFn({ data: { provider: p } });
      toast.success(`Active provider: ${p}`);
      qc.invalidateQueries({ queryKey: ["ai-settings"] });
    } catch (e: any) { toast.error(e.message); }
  }

  async function test(p: "lovable" | "openai" | "anthropic") {
    setTesting(p);
    try {
      const r = await testFn({ data: { provider: p } });
      setResult((s) => ({ ...s, [p]: r as any }));
      if (r.ok) toast.success(`${p}: connection OK`);
      else toast.error(`${p}: ${r.error ?? "failed"}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setTesting(null); }
  }

  return (
    <div>
      <PanelHeader n="07" kicker="Section" title="AI Settings" />

      <div className="mb-8 border border-white/10 p-6">
        <div className="label-xs">Active provider</div>
        <div className="mt-2 font-display text-4xl serif-italic text-african-gold">{data?.provider ?? "…"}</div>
        <div className="mt-2 text-xs text-muted-foreground">API keys are stored as server-side secrets. They are never sent to the browser.</div>
      </div>

      <div className="divide-y divide-white/10 border-y border-white/10">
        {providers.map((p) => {
          const active = data?.provider === p.id;
          const r = result[p.id];
          return (
            <div key={p.id} className="grid grid-cols-12 items-center gap-4 py-6">
              <div className="col-span-6">
                <div className="flex items-center gap-3">
                  <span className="font-display text-2xl">{p.label}</span>
                  {active && <span className="rounded-sm border border-african-gold px-2 py-0.5 text-[10px] uppercase tracking-widest text-african-gold">Active</span>}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{p.desc}</div>
                <div className="mt-2 font-mono text-xs text-muted-foreground">
                  {p.keyName}: {p.present ? <span className="text-cyber-cyan">saved</span> : <span className="text-destructive">not set</span>}
                </div>
                {r && (
                  <div className={`mt-2 text-xs ${r.ok ? "text-cyber-cyan" : "text-destructive"}`}>
                    {r.ok ? "Connection OK" : `Failed: ${r.error ?? "unknown"}`}
                  </div>
                )}
              </div>
              <div className="col-span-6 flex items-center justify-end gap-3">
                <button onClick={() => test(p.id)} disabled={testing === p.id}
                  className="border border-white/15 px-4 py-2 text-xs uppercase tracking-widest hover:border-african-gold disabled:opacity-50">
                  {testing === p.id ? "Testing…" : "Test connection"}
                </button>
                {!active && (
                  <button onClick={() => select(p.id)}
                    className="rounded-sm bg-foreground px-4 py-2 font-display text-sm text-background hover:bg-african-gold">
                    Use this
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 border border-white/10 p-6 text-sm text-muted-foreground">
        <div className="label-xs mb-2">Adding your own keys</div>
        <p>To add or rotate an OpenAI or Anthropic key, ask the assistant to add the secret <span className="font-mono text-african-gold">OPENAI_API_KEY</span> or <span className="font-mono text-african-gold">ANTHROPIC_API_KEY</span>. You'll be prompted in a secure form. Values are stored server-side only.</p>
      </div>
    </div>
  );
}

/* -------------------- NEW: USERS -------------------- */

function UsersPanel() {
  const qc = useQueryClient();
  const list = useServerFn(listAdminUsers);
  const setRole = useServerFn(setUserRole);
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });

  async function toggleAdmin(userId: string, hasAdmin: boolean) {
    try {
      await setRole({ data: { userId, role: "admin", grant: !hasAdmin } });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(hasAdmin ? "Admin removed" : "Admin granted");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div>
      <PanelHeader n="08" kicker="Section" title={`Users · ${users.length}`} />
      <div className="border-t border-white/10">
        {users.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No users.</div>
        ) : users.map((u: any, i: number) => {
          const isAdmin = u.roles.includes("admin");
          return (
            <div key={u.id} className="grid grid-cols-12 items-center gap-4 border-b border-white/10 py-4">
              <div className="col-span-1 folio text-xl text-african-gold/50">{String(i + 1).padStart(2, "0")}</div>
              <div className="col-span-4 truncate text-sm">{u.email ?? <span className="text-muted-foreground">no email</span>}</div>
              <div className="col-span-3 truncate font-mono text-xs text-muted-foreground">{u.id}</div>
              <div className="col-span-2 text-xs text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}</div>
              <div className="col-span-1 serif-italic text-xs text-african-gold">{isAdmin ? "admin" : "user"}</div>
              <div className="col-span-1 text-right">
                <button onClick={() => toggleAdmin(u.id, isAdmin)} className={`serif-italic text-xs hover:underline ${isAdmin ? "text-destructive" : "text-cyber-cyan"}`}>
                  {isAdmin ? "revoke" : "grant"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------- NEW: AUDIT LOG -------------------- */

function AuditPanel() {
  const list = useServerFn(listAuditLogs);
  const { data: rows = [] } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => list({ data: { limit: 100 } }),
  });
  return (
    <div>
      <PanelHeader n="09" kicker="Section" title={`Audit Log · ${rows.length}`} />
      <div className="border-t border-white/10">
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No admin actions logged yet.</div>
        ) : rows.map((r: any) => (
          <div key={r.id} className="grid grid-cols-12 items-center gap-4 border-b border-white/10 py-3 text-sm">
            <div className="col-span-3 font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
            <div className="col-span-3 font-display text-base">{r.action}</div>
            <div className="col-span-2 text-xs text-muted-foreground">{r.entity_type ?? "—"}</div>
            <div className="col-span-3 truncate font-mono text-xs text-muted-foreground">{r.entity_id ?? "—"}</div>
            <div className="col-span-1 text-right text-xs text-muted-foreground">{r.actor_user_id ? r.actor_user_id.slice(0, 6) : "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
