import { DEFAULT_STATUSES } from "@/lib/defaults";

export function MatchRing({ score, size = 56 }: { score: number; size?: number }) {
  const color = score >= 90 ? "#16a34a" : score >= 80 ? "#4f46e5" : score >= 70 ? "#f59e0b" : "#94a3b8";
  const r = (size - 8) / 2, c = 2 * Math.PI * r, off = c * (1 - score / 100);
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="font-bold" fontSize={size / 4} fill={color}>{score}</text>
    </svg>
  );
}

export function Stat({ label, value, tone = "slate" }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = DEFAULT_STATUSES.find((x) => x.name.toLowerCase() === status.toLowerCase());
  const color = s?.color || "#94a3b8";
  return <span className="badge" style={{ background: `${color}22`, color }}>{status}</span>;
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DemoBadge() {
  return <span className="badge bg-amber-100 text-amber-700">DEMO DATA</span>;
}

export function timeAgo(d?: Date | string | null) {
  if (!d) return "—";
  const t = new Date(d).getTime(), diff = Date.now() - t;
  const h = Math.floor(diff / 3.6e6);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
