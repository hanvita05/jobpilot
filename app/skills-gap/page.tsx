import { currentUser, getFeed, getProfile } from "@/lib/server";
import { KeywordCheck } from "@/lib/types";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SkillsGap() {
  const user = await currentUser();
  const profile = await getProfile(user.id);
  const feed = await getFeed(user.id, { sort: "best" });

  // Count how often each skill is REQUESTED but missing across the feed.
  const demand = new Map<string, { total: number; missing: number; required: number }>();
  for (const { match } of feed) {
    const kws: KeywordCheck[] = JSON.parse(match.keywordsJson);
    for (const k of kws) {
      const e = demand.get(k.keyword) || { total: 0, missing: 0, required: 0 };
      e.total++;
      if (!k.inResume) e.missing++;
      if (k.requirement === "required") e.required++;
      demand.set(k.keyword, e);
    }
  }
  const gaps = Array.from(demand.entries())
    .filter(([, v]) => v.missing > 0)
    .map(([skill, v]) => ({ skill, ...v, impact: v.missing }))
    .sort((a, b) => b.impact - a.impact);

  const have = Array.from(demand.entries())
    .filter(([, v]) => v.missing === 0 && v.total > 1)
    .map(([skill, v]) => ({ skill, total: v.total }))
    .sort((a, b) => b.total - a.total).slice(0, 12);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Skills Gap Analysis</h1>
      <p className="text-slate-500 mb-6">Based on {feed.length} matched jobs and your active resume.</p>

      <Section title="Most valuable skills to add">
        {gaps.length === 0 ? <div className="card p-6 text-slate-500 text-sm">No recurring gaps — your resume covers the skills your matches ask for.</div> : (
          <div className="grid gap-2">
            {gaps.slice(0, 12).map((g) => (
              <div key={g.skill} className="card p-3 flex items-center gap-3">
                <div className="w-32 font-medium capitalize">{g.skill}</div>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (g.missing / feed.length) * 100 * 3)}%` }} />
                </div>
                <div className="text-xs text-slate-500 w-40 text-right">
                  wanted by {g.missing} job{g.missing > 1 ? "s" : ""}{g.required ? ` · ${g.required} require it` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-2">These are honest gaps — skills your target roles ask for that aren't on your resume yet. Adding real experience with them (not just listing them) would lift your match scores.</p>
      </Section>

      <Section title="Strengths that show up across your matches">
        <div className="flex flex-wrap gap-2">
          {have.map((h) => <span key={h.skill} className="badge bg-green-100 text-green-700 capitalize">{h.skill} · {h.total} jobs</span>)}
        </div>
      </Section>
    </div>
  );
}
