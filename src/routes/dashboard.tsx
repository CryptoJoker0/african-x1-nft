import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useWallet } from "@/lib/wallet";
import { WalletButton } from "@/components/site/WalletButton";
import { toast } from "sonner";
import { LogOut, Wallet, Image as ImageIcon, History, User } from "lucide-react";
import preReveal from "@/assets/pre-reveal.jpg";

interface OwnedNFT {
  id: string;
  token_id: number;
  name: string;
  image_url: string | null;
}

interface TxRow {
  id: string;
  created_at: string;
  tx_type: string;
  status: string;
  amount: number | null;
  signature: string | null;
}

interface ProfileRow {
  username: string | null;
  wallet_address: string | null;
}

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AFRICAN X1 NFT" },
      {
        name: "description",
        content:
          "Your AFRICAN X1 NFT dashboard: owned NFTs, mint history, transactions and wallet.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading } = useAuth();
  const { address } = useWallet();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"nfts" | "history" | "profile">("nfts");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
  });

  const { data: owned = [] } = useQuery({
    enabled: !!user,
    queryKey: ["owned-nfts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("nfts")
        .select("*")
        .eq("owner_user_id", user!.id)
        .order("token_id");
      return data ?? [];
    },
  });

  const { data: txs = [] } = useQuery({
    enabled: !!user,
    queryKey: ["txs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-african-gold">
            Holder dashboard
          </div>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl">
            Welcome back,{" "}
            <span className="text-gradient-cyber">
              {profile?.username || user.email?.split("@")[0]}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <WalletButton />
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              toast("Signed out");
              navigate({ to: "/" });
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Wallet"
          value={address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected"}
          icon={<Wallet size={18} />}
        />
        <StatCard
          label="Owned NFTs"
          value={owned.length.toString()}
          icon={<ImageIcon size={18} />}
          accent
        />
        <StatCard label="Transactions" value={txs.length.toString()} icon={<History size={18} />} />
      </div>

      <div className="mt-8 flex gap-1 rounded-full border border-white/10 bg-white/[0.02] p-1 w-fit">
        {(
          [
            { id: "nfts", label: "My NFTs" },
            { id: "history", label: "Transactions" },
            { id: "profile", label: "Profile" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? "bg-cyber-cyan/15 text-cyber-cyan"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "nfts" &&
          (owned.length === 0 ? (
            <EmptyPanel
              title="You don't own any AFRICAN X1 NFTs yet."
              cta={
                <Link
                  to="/mint"
                  className="mt-3 inline-flex rounded-full bg-cyber-cyan px-4 py-2 text-sm font-semibold text-background hover:glow-blue"
                >
                  Mint your first
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {(owned as OwnedNFT[]).map((n) => (
                <div key={n.id} className="overflow-hidden rounded-2xl glass-card">
                  <img
                    src={n.image_url ?? preReveal}
                    alt={n.name}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm">{n.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">#{n.token_id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {tab === "history" &&
          (txs.length === 0 ? (
            <EmptyPanel title="No transactions yet." />
          ) : (
            <div className="overflow-hidden rounded-2xl glass-card">
              <table className="w-full text-sm">
                <thead className="border-b border-white/5 text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {(txs as TxRow[]).map((t) => (
                    <tr key={t.id} className="border-b border-white/5 last:border-0">
                      <td className="p-4 text-muted-foreground">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 capitalize">{t.tx_type}</td>
                      <td className="p-4">
                        <StatusPill s={t.status} />
                      </td>
                      <td className="p-4 text-african-gold">{t.amount ?? "—"}</td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">
                        {t.signature ? `${t.signature.slice(0, 8)}…` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {tab === "profile" && <ProfileForm userId={user.id} initial={profile} />}
      </div>
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const cls =
    s === "confirmed"
      ? "bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/40"
      : s === "failed"
        ? "bg-destructive/15 text-destructive border-destructive/40"
        : "bg-african-gold/15 text-african-gold border-african-gold/40";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${cls}`}
    >
      {s}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </span>
        <span className="text-cyber-cyan">{icon}</span>
      </div>
      <div className={`mt-3 font-display text-2xl ${accent ? "text-african-gold" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function EmptyPanel({ title, cta }: { title: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-2xl glass-card p-10 text-center text-muted-foreground">
      {title}
      {cta}
    </div>
  );
}

function ProfileForm({
  userId,
  initial,
}: {
  userId: string;
  initial: ProfileRow | null | undefined;
}) {
  const [username, setUsername] = useState(initial?.username ?? "");
  const [wallet, setWallet] = useState(initial?.wallet_address ?? "");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      username,
      wallet_address: wallet || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  }

  return (
    <form onSubmit={save} className="max-w-lg rounded-2xl glass-card p-6">
      <div className="mb-4 flex items-center gap-2 text-african-gold">
        <User size={16} />
        <span className="text-[10px] uppercase tracking-[0.25em]">Profile</span>
      </div>
      <label className="mb-3 block text-xs text-muted-foreground">
        Display name
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm text-foreground"
        />
      </label>
      <label className="mb-4 block text-xs text-muted-foreground">
        Primary wallet
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="X1 wallet address"
          className="mt-1 w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 font-mono text-xs text-foreground"
        />
      </label>
      <button
        disabled={saving}
        className="rounded-full bg-cyber-cyan px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
