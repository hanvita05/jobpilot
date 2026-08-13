import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser, getActiveResume, getProfile, getPreferences } from "@/lib/server";
import { getAI } from "@/lib/ai";
import { matchJob } from "@/lib/matcher";
import { NormalizedJob } from "@/lib/types";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  const { jobId } = await req.json();
  const [job, profile, resume, prefs] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    getProfile(user.id), getActiveResume(user.id), getPreferences(user.id),
  ]);
  if (!job || !profile || !resume) return NextResponse.json({ error: "missing data" }, { status: 400 });

  const nj: NormalizedJob = { company: job.company, title: job.title, location: job.location, jobType: job.jobType as any, workMode: job.workMode as any, startDate: job.startDate, postedDate: null, description: job.description, url: job.url, source: "db", sourceId: job.id };
  const match = matchJob(nj, profile, prefs);
  const out = await getAI().tailorResume({ profile, job: nj, match });

  const saved = await prisma.tailoredResume.create({
    data: { userId: user.id, jobId, resumeId: resume.id, changesJson: JSON.stringify(out) },
  });
  return NextResponse.json({ ok: true, id: saved.id, ...out });
}
