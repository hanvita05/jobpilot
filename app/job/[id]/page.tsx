import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUser, getActiveResume } from "@/lib/server";
import { MatchRing, DemoBadge } from "@/components/ui";
import JobActions from "@/components/JobActions";
import { KeywordCheck, MatchBreakdown } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function JobDetail({ params }: { params: { id: string } }) {
  const user = await currentUser();
  const resume = await getActiveResume(user.id);
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: { sources: true, matches: { where: { resumeId: resume?.id } } },
  });
  if (!job) return notFound();
  const saved = await prisma.savedJob.findUnique({ where: { userId_jobId: { userId: user.id, jobId: job.id } } });
  const m = job.matches[0];
  const breakdown: MatchBreakdown | null = m ? JSON.parse(m.breakdownJson) : null;
  const strengths: string[] = m ? JSON.parse(m.strengthsJson) : [];
  const gaps: string[] = m ? JSON.parse(m.gapsJson) : [];
  const keywords: KeywordCheck[] = m ? JSON.parse(m.keywordsJson) : [];

  const labels: Record<string, string> = {
    education: "Education", gradDate: "Graduation date", technicalSkills: "Technical skills",
    requiredSkills: "Required skills", preferredSkills: "Preferred skills", experience: "Relevant experience",
    roleAlignment: "Role alignment", seniority: "Seniority", location: "Location",
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <div className="flex items-start gap-2 mb-2">
          <h1 className="text-2xl font-bold">{job.title}</h1>
          {job.isDemo && <DemoBadge />}
        </div>
        <p className="text-slate-600">{job.company} · {job.location} · {job.workMode} · {job.jobType}</p>
        <div className="text-sm text-slate-400 mt-1">
          {job.startDate && `Start: ${job.startDate} · `}{job.salary && `${job.salary} · `}
          Sources: {job.sources.map((s) => s.source).join(", ")}
        </div>
        <div className="mt-4"><JobActions jobId={job.id} url={job.url} saved={!!saved} /></div>

        <h2 className="text-lg font-semibold mt-8 mb-2">Why this job fits you</h2>
        <ul className="space-y-1.5 text-sm">
          {strengths.map((s, i) => <li key={i} className="flex gap-2"><span className="text-green-600">✓</span>{s}</li>)}
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">Missing / weaker qualifications</h2>
        <ul className="space-y-1.5 text-sm">
          {gaps.length ? gaps.map((g, i) => <li key={i} className="flex gap-2"><span className="text-amber-500">•</span>{g}</li>)
            : <li className="text-slate-500">No notable gaps detected.</li>}
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">Keyword alignment</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr><th className="text-left px-4 py-2">Keyword</th><th className="text-left px-4 py-2">Requirement</th><th className="text-left px-4 py-2">On your resume</th></tr>
            </thead>
            <tbody>
              {keywords.map((k) => (
                <tr key={k.keyword} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{k.keyword}</td>
                  <td className="px-4 py-2 text-slate-500 capitalize">{k.requirement}</td>
                  <td className="px-4 py-2">{k.inResume ? <span className="text-green-600">✓ Yes</span> : <span className="text-slate-400">Not shown</span>}</td>
                </tr>
              ))}
              {keywords.length === 0 && <tr><td colSpan={3} className="px-4 py-3 text-slate-500">No specific skills detected in this posting.</td></tr>}
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-semibold mt-6 mb-2">Full description</h2>
        <div className="card p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-72 overflow-y-auto">{job.description}</div>
        <a href={job.url} target="_blank" rel="noreferrer" className="btn-primary mt-4">Open original posting ↗</a>
      </div>

      <aside>
        <div className="card p-5 sticky top-6 text-center">
          <div className="flex justify-center mb-2"><MatchRing score={m?.score ?? 0} size={96} /></div>
          <div className="text-sm text-slate-500 mb-4">Match on your active resume</div>
          <div className="space-y-2 text-left">
            {breakdown && Object.entries(breakdown).map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-xs mb-0.5"><span className="text-slate-600">{labels[k] || k}</span><span className="font-medium">{v}%</span></div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-brand rounded-full" style={{ width: `${v}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
