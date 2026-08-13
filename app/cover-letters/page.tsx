import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function CoverLetters() {
  const user = await currentUser();
  const letters = await prisma.coverLetter.findMany({
    where: { userId: user.id }, include: { job: true }, orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Cover Letters</h1>
      <p className="text-slate-500 mb-4 text-sm">Generated from your real experience only — nothing fabricated. Create one from any job's detail page.</p>
      <div className="space-y-4">
        {letters.map((l) => (
          <details key={l.id} className="card p-4">
            <summary className="font-semibold cursor-pointer">{l.job.title} · {l.job.company}</summary>
            <pre className="mt-3 text-sm text-slate-700 whitespace-pre-wrap font-sans">{l.content}</pre>
          </details>
        ))}
        {letters.length === 0 && <div className="card p-8 text-center text-slate-500">No cover letters yet. Open a job and click “✉ Cover letter.”</div>}
      </div>
    </div>
  );
}
