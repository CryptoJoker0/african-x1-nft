import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";
import { Pause, Play, Eye, Settings, Users, Activity, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — AFRICAN X1 NFT" },
      { name: "description", content: "Operate the AFRICAN X1 NFT collection." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

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

  if (loading || roleLoading || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">Verifying admin access…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert size={40} className="mx-auto text-destructive" />
        <h1 className="mt-4 font-display text-2xl">Restricted area</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account doesn't have admin privileges. Ask a collection admin to grant your account the <span className="font-mono text-african-gold">admin</span> role.
        </p>
        <Link to="/dashboard" className="mt-6 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm">Back to dashboard</Link>
      </div>
    );
  }

  async function updateConfig(patch: Partial<NonNullable<typeof config>>) {
    const { error } = await supabase.from("collection_config").update(patch).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Config updated");
    qc.invalidateQueries({ queryKey: ["config"] });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-10">
        <div className="text-[10px] uppercase tracking-[0.3em] text-african-gold">Admin Control</div>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">Collection <span className="text-gradient-cyber">command deck</span></h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total NFTs" value={stats?.totalNfts ?? 0} icon={<Activity size={16} />} />
        <Stat label="Minted" value={stats?.minted ?? 0} accent icon={<Activity size={16} />} />
        <Stat label="Transactions" value={stats?.txs ?? 0} icon={<Activity size={16} />} />
        <Stat label="Whitelisted" value={stats?.whitelist ?? 0} icon={<Users size={16} />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Mint controls */}
        <div className="rounded-2xl glass-card p-6">
          <div className="mb-4 flex items-center gap-2 text-african-gold">
            <Settings size={16} /><span className="text-[10px] uppercase tracking-[0.25em]">Mint controls</span>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => updateConfig({ mint_paused: !config?.mint_paused })}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left hover:border-cyber-cyan/30"
            >
              <span>{config?.mint_paused ? "Resume mint" : "Pause mint"}</span>
              {config?.mint_paused ? <Play size={16} className="text-cyber-cyan" /> : <Pause size={16} className="text-african-gold" />}
            </button>
            <button
              onClick={() => updateConfig({ whitelist_only: !config?.whitelist_only })}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left hover:border-cyber-cyan/30"
            >
              <span>Whitelist-only mint</span>
              <Toggle on={!!config?.whitelist_only} />
            </button>
            <button
              onClick={() => updateConfig({ revealed: !config?.revealed })}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left hover:border-cyber-cyan/30"
            >
              <span className="flex items-center gap-2"><Eye size={14} /> Reveal collection</span>
              <Toggle on={!!config?.revealed} />
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="rounded-2xl glass-card p-6">
          <div className="mb-4 flex items-center gap-2 text-african-gold">
            <Settings size={16} /><span className="text-[10px] uppercase tracking-[0.25em]">Collection config</span>
          </div>
          <ConfigForm config={config} onSave={updateConfig} />
        </div>

        {/* Whitelist */}
        <div className="rounded-2xl glass-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2 text-african-gold">
            <Users size={16} /><span className="text-[10px] uppercase tracking-[0.25em]">Whitelist ({whitelist.length})</span>
          </div>
          <WhitelistManager rows={whitelist} userId={user.id} onChange={() => qc.invalidateQueries({ queryKey: ["whitelist"] })} />
        </div>
      </div>
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${on ? "bg-cyber-cyan" : "bg-white/10"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition ${on ? "translate-x-4" : "translate-x-0.5"}`} />
    </span>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        <span>{label}</span><span className="text-cyber-cyan">{icon}</span>
      </div>
      <div className={`mt-2 font-display text-2xl ${accent ? "text-african-gold" : ""}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function ConfigForm({ config, onSave }: { config: any; onSave: (p: any) => void }) {
  const [price, setPrice] = useState<number>(config?.mint_price ?? 0);
  const [max, setMax] = useState<number>(config?.max_per_wallet ?? 5);
  const [supply, setSupply] = useState<number>(config?.max_supply ?? 5000);
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
    <form
      onSubmit={(e) => { e.preventDefault(); onSave({ mint_price: price, max_per_wallet: max, max_supply: supply, treasury_wallet: treasury || null, rpc_url: rpc, program_id: program || null }); }}
      className="space-y-3 text-sm"
    >
      <Field label="Mint price (X1)" value={price} onChange={(v: string) => setPrice(Number(v))} type="number" step="0.01" />
      <Field label="Max per wallet" value={max} onChange={(v: string) => setMax(Number(v))} type="number" />
      <Field label="Max supply" value={supply} onChange={(v: string) => setSupply(Number(v))} type="number" />
      <Field label="Treasury wallet" value={treasury} onChange={setTreasury} mono />
      <Field label="X1 RPC URL" value={rpc} onChange={setRpc} mono />
      <Field label="Program ID" value={program} onChange={setProgram} mono placeholder="Deploy your Anchor program, then paste here" />
      <button className="mt-2 rounded-full bg-cyber-cyan px-4 py-2 text-sm font-semibold text-background hover:glow-blue">Save config</button>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", step, mono, placeholder }: any) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <input
        type={type} step={step} value={value ?? ""} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm focus:border-cyber-cyan/60 focus:outline-none ${mono ? "font-mono text-xs" : ""}`}
      />
    </label>
  );
}

function WhitelistManager({ rows, userId, onChange }: { rows: any[]; userId: string; onChange: () => void }) {
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
    <>
      <form onSubmit={add} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="X1 wallet address"
          className="flex-1 rounded-lg border border-white/10 bg-background/60 px-3 py-2 font-mono text-xs"
        />
        <input
          value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
          className="sm:w-48 rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm"
        />
        <button className="rounded-full bg-cyber-cyan px-4 py-2 text-sm font-semibold text-background">Add</button>
      </form>
      <div className="overflow-hidden rounded-xl border border-white/5">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No whitelisted wallets yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/5 text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr><th className="p-3">Wallet</th><th className="p-3">Note</th><th className="p-3">Added</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="p-3 font-mono text-xs">{r.wallet_address}</td>
                  <td className="p-3 text-muted-foreground">{r.note ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right"><button onClick={() => remove(r.id)} className="text-xs text-destructive hover:underline">Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
