import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentUser, getFeed, getProfile } from "@/lib/server";
import { MatchRing, Stat, Section, StatusBadge, DemoBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await currentUser();
  const profile = await getProfile(user.id);
  const feed = await getFeed(user.id, { sort: "best" });
  const apps = await prisma.application.findMany({ where: { userId: user.id } });

  const top = feed.slice(0, 5);
  const strong = feed.filter((f) => f.match.score >= 90).length;
  const interviews = apps.filter((a) => /interview/i.test(a.status)).length;
  const offers = apps.filter((a) => /offer|accepted/i.test(a.status)).length;
  const needFollowUp = apps.filter((a) => a.status === "Waiting" || a.status === "Applied").length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const pipeline = ["Saved", "Applied", "Interview", "Offer"].map((stage) => ({
    stage, count: apps.filter((a) => a.status.toLowerCase().includes(stage.toLowerCase())).length,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">{greeting}, {(profile?.name || user.name || "there").split(" ")[0]} 👋</h1>
        <DemoBadge />
      </div>
      <p className="text-slate-500 mb-6">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>

      <Section title="Today's Priorities">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Jobs ≥90% match" value={`🔥 ${strong}`} />
          <Stat label="Need follow-up" value={`⏰ ${needFollowUp}`} />
          <Stat label="Interviews" value={`💼 ${interviews}`} />
          <Stat label="Offers" value={`🎉 ${offers}`} />
        </div>
      </Section>

      <Section title="Top Jobs Today" action={<Link className="text-sm text-brand-700" href="/feed">View all →</Link>}>
        <div className="grid gap-3">
          {top.length === 0 && <div className="card p-6 text-slate-500 text-sm">No matches yet. Run ingestion (Settings → Sources) or check the demo feed.</div>}
          {top.map(({ job, match }) => (
            <Link key={job.id} href={`/job/${job.id}`} className="card p-4 flex items-center gap-4 hover:shadow-md transition">
              <MatchRing score={match.score} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{job.title}</div>
                <div className="text-sm text-slate-500 truncate">{job.company} · {job.location} · {job.jobType}</div>
              </div>
              {job.isDemo && <DemoBadge />}
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Application Pipeline">
        <div className="card p-4 flex items-center justify-between text-center">
          {pipeline.map((p, i) => (
            <div key={p.stage} className="flex items-center flex-1">
              <div className="flex-1">
                <div className="text-2xl font-bold">{p.count}</div>
                <div className="text-xs text-slate-500">{p.stage}</div>
              </div>
              {i < pipeline.length - 1 && <div className="text-slate-300">→</div>}
            </div>
          ))}
        </div>
      </Section>

      <div className="flex flex-wrap gap-2">
        <Link href="/applications" className="btn-primary">+ Add Application</Link>
        <Link href="/resume" className="btn-ghost">Upload Resume</Link>
        <Link href="/feed" className="btn-ghost">Find Jobs</Link>
      </div>
    </div>
  );
}
