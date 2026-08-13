import { prisma } from "@/lib/db";
import { currentUser, getFeed } from "@/lib/server";
import AnalyticsClient from "@/components/AnalyticsClient";
import { Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Analytics() {
  const user = await currentUser();
  const apps = await prisma.application.findMany({ where: { userId: user.id } });
  const feed = await getFeed(user.id, { sort: "best" });

  const has = (s: string, re: RegExp) => re.test(s);
  const funnel = [
    { stage: "Applied", count: apps.filter((a) => !has(a.status, /interested|saved|planning/i)).length },
    { stage: "Screen", count: apps.filter((a) => has(a.status, /screen|interview|offer|accepted/i)).length },
    { stage: "Interview", count: apps.filter((a) => has(a.status, /interview|offer|accepted/i)).length },
    { stage: "Offer", count: apps.filter((a) => has(a.status, /offer|accepted/i)).length },
  ];

  const statusCounts = new Map<string, number>();
  for (const a of apps) statusCounts.set(a.status, (statusCounts.get(a.status) || 0) + 1);
  const statusData = Array.from(statusCounts.entries()).map(([name, value]) => ({ name, value }));

  const buckets = { "90-100": 0, "80-89": 0, "70-79": 0, "<70": 0 };
  for (const f of feed) { const s = f.match.score; if (s >= 90) buckets["90-100"]++; else if (s >= 80) buckets["80-89"]++; else if (s >= 70) buckets["70-79"]++; else buckets["<70"]++; }
  const scoreDist = Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));

  const applied = apps.filter((a) => !has(a.status, /interested|saved|planning/i)).length;
  const interviews = funnel[2].count;
  const rate = applied ? Math.round((interviews / applied) * 100) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Applications" value={apps.length} />
        <Stat label="Interview rate" value={`${rate}%`} />
        <Stat label="Feed jobs" value={feed.length} />
        <Stat label="≥90% matches" value={feed.filter((f) => f.match.score >= 90).length} />
      </div>
      <AnalyticsClient funnel={funnel} statusData={statusData} scoreDist={scoreDist} />
    </div>
  );
}
