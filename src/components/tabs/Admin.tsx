import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/AppContext";
import { listAllUsers, type Profile } from "@/lib/firestore";
import { Users, TrendingUp, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type SignupBucket = { date: string; count: number };

function bucketByDay(profiles: Profile[]): SignupBucket[] {
  const counts = new Map<string, number>();
  profiles.forEach((p) => {
    const ts = p.createdAt;
    if (!ts || typeof ts.toDate !== "function") return;
    const d = ts.toDate();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  // last 30 days
  const out: SignupBucket[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ date: key, count: counts.get(key) || 0 });
  }
  return out;
}

function SignupChart({ data }: { data: SignupBucket[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const width = 320;
  const height = 120;
  const stepX = width / Math.max(1, data.length - 1);
  const points = data
    .map((d, i) => `${i * stepX},${height - (d.count / max) * height}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full h-32">
      <defs>
        <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.7 0.22 280)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.55 0.3 300)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="url(#adminGrad)"
        stroke="none"
        points={`0,${height} ${points} ${width},${height}`}
      />
      <polyline
        fill="none"
        stroke="oklch(0.7 0.22 280)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <text x="0" y={height + 16} fontSize="9" fill="currentColor" opacity="0.5">
        {data[0]?.date.slice(5)}
      </text>
      <text x={width} y={height + 16} fontSize="9" fill="currentColor" opacity="0.5" textAnchor="end">
        {data[data.length - 1]?.date.slice(5)}
      </text>
    </svg>
  );
}

export function AdminTab() {
  const { isAdmin } = useApp();
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    listAllUsers()
      .then(setUsers)
      .catch((e) => {
        setError(e.message || "Access denied");
        toast.error("Admin fetch failed: " + (e.message || "permission denied"));
      });
  }, [isAdmin]);

  const buckets = useMemo(() => (users ? bucketByDay(users) : []), [users]);
  const totalSignups = buckets.reduce((s, b) => s + b.count, 0);

  if (!isAdmin) {
    return (
      <div className="px-5 pt-10 pb-24 text-center">
        <ShieldAlert className="h-10 w-10 mx-auto text-destructive mb-3" />
        <h2 className="text-xl font-bold">Restricted</h2>
        <p className="text-sm text-muted-foreground mt-2">Admin access only.</p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-2 pb-24 space-y-5">
      <h2 className="text-2xl font-bold">Admin</h2>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
          <Users className="h-3.5 w-3.5" /> Total users
        </div>
        <p className="text-4xl font-bold gradient-text">{users?.length ?? "…"}</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Signups · last 30 days
          </div>
          <span className="text-sm font-semibold">{totalSignups}</span>
        </div>
        {users ? <SignupChart data={buckets} /> : <p className="text-sm text-muted-foreground">Loading…</p>}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Users</p>
        <ul className="divide-y divide-border/50">
          {(users || []).map((u) => (
            <li key={u.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{u.name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email || u.id}</p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {u.language}
              </span>
            </li>
          ))}
          {users?.length === 0 && <li className="py-3 text-sm text-muted-foreground">No users yet.</li>}
        </ul>
      </section>
    </div>
  );
}
