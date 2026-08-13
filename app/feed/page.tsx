import Link from "next/link";
import { currentUser, getFeed } from "@/lib/server";
import { MatchRing, DemoBadge, timeAgo } from "@/components/ui";
import JobActions from "@/components/JobActions";
import LocationSearch from "@/components/LocationSearch";

export const dynamic = "force-dynamic";

export default async function Feed({ 
  searchParams 
}: { 
  searchParams: { min?: string; sort?: string; loc?: string } 
}) {
  const user = await currentUser();
  const min = parseInt(searchParams.min || "0", 10);
  const sort = searchParams.sort || "best";
  const loc = (searchParams.loc || "").trim().toLowerCase();

  const allRows = await getFeed(user.id, { minScore: min, sort });

  // Filter rows locally based on typed location input
  const rows = loc
    ? allRows.filter(({ job }) => job.location.toLowerCase().includes(loc))
    : allRows;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Job Feed</h1>
      <p className="text-slate-500 mb-4">{rows.length} matches for your active resume</p>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-5 text-sm">
        {/* Match Score Group */}
        {[["All", "0"], ["≥70%", "70"], ["≥80%", "80"], ["≥90%", "90"]].map(([label, v]) => (
          <Link 
            key={v} 
            href={`/feed?min=${v}&sort=${sort}${loc ? `&loc=${encodeURIComponent(loc)}` : ""}`}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              min === parseInt(v) 
                ? "bg-brand text-white border-brand shadow-sm" 
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {label}
          </Link>
        ))}

        <span className="mx-1 text-slate-300">|</span>

        {/* Sort Group */}
        {[["Best match", "best"], ["Newest", "newest"]].map(([label, v]) => (
          <Link 
            key={v} 
            href={`/feed?min=${min}&sort=${v}${loc ? `&loc=${encodeURIComponent(loc)}` : ""}`}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              sort === v 
                ? "bg-slate-800 text-white border-slate-800 shadow-sm" 
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {label}
          </Link>
        ))}

        <span className="mx-1 text-slate-300">|</span>

        {/* Typed Location Search Input */}
        <LocationSearch initialValue={searchParams.loc || ""} />
      </div>

      {/* Job Feed Cards */}
      <div className="grid gap-3">
        {rows.map(({ job, match, saved }) => (
          <div key={job.id} className="card p-4">
            <div className="flex items-start gap-4">
              <MatchRing score={match.score} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/job/${job.id}`} className="font-semibold hover:text-brand-700">{job.title}</Link>
                  {job.isDemo && <DemoBadge />}
                </div>
                <div className="text-sm text-slate-500">{job.company} · {job.location} · {job.workMode}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {job.jobType}{job.startDate ? ` · Starts ${job.startDate}` : ""}{job.salary ? ` · ${job.salary}` : ""} · Posted {timeAgo(job.postedDate)}
                </div>
                <div className="mt-3"><JobActions jobId={job.id} url={job.url} saved={saved} /></div>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="card p-8 text-center text-slate-500">
            No jobs match this location or score filter yet.
          </div>
        )}
      </div>
    </div>
  );
}