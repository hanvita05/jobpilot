import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentUser, getFeed } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function Companies() {
  const user = await currentUser();
  const feed = await getFeed(user.id, { sort: "best" });
  const apps = await prisma.application.findMany({ where: { userId: user.id } });

  const map = new Map<string, { jobs: number; bestScore: number; apps: number }>();
  for (const { job, match } of feed) {
    const e = map.get(job.company) || { jobs: 0, bestScore: 0, apps: 0 };
    e.jobs++; e.bestScore = Math.max(e.bestScore, match.score); map.set(job.company, e);
  }
  for (const a of apps) {
    const e = map.get(a.company) || { jobs: 0, bestScore: 0, apps: 0 };
    e.apps++; map.set(a.company, e);
  }
  const companies = Array.from(map.entries()).sort((a, b) => b[1].bestScore - a[1].bestScore);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Companies</h1>
      <div className="grid md:grid-cols-2 gap-3">
        {companies.map(([name, c]) => (
          <div key={name} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{name}</div>
              <div className="text-xs text-slate-500">{c.jobs} open match{c.jobs === 1 ? "" : "es"} · {c.apps} application{c.apps === 1 ? "" : "s"}</div>
            </div>
            {c.bestScore > 0 && <span className="badge bg-brand-50 text-brand-700">best {c.bestScore}%</span>}
          </div>
        ))}
        {companies.length === 0 && <div className="card p-8 text-center text-slate-500">No companies yet.</div>}
      </div>
    </div>
  );
}
