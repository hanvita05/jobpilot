import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentUser, getActiveResume } from "@/lib/server";
import { MatchRing, DemoBadge } from "@/components/ui";
import JobActions from "@/components/JobActions";

export const dynamic = "force-dynamic";

export default async function Saved() {
  const user = await currentUser();
  const resume = await getActiveResume(user.id);
  const saved = await prisma.savedJob.findMany({
    where: { userId: user.id },
    include: { job: { include: { matches: { where: { resumeId: resume?.id } } } } },
    orderBy: { at: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Saved Jobs</h1>
      <div className="grid gap-3">
        {saved.map(({ job }) => (
          <div key={job.id} className="card p-4 flex items-start gap-4">
            <MatchRing score={job.matches[0]?.score ?? 0} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><Link href={`/job/${job.id}`} className="font-semibold hover:text-brand-700">{job.title}</Link>{job.isDemo && <DemoBadge />}</div>
              <div className="text-sm text-slate-500">{job.company} · {job.location}</div>
              <div className="mt-3"><JobActions jobId={job.id} url={job.url} saved compact /></div>
            </div>
          </div>
        ))}
        {saved.length === 0 && <div className="card p-8 text-center text-slate-500">No saved jobs yet. Tap 🤍 Save on any job.</div>}
      </div>
    </div>
  );
}
