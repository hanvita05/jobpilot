import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser, getActiveResume } from "@/lib/server";

// When the user clicks "Apply ↗", we open the posting AND create a tracked
// application in "Planning to Apply" so nothing slips through (§20).
export async function POST(req: NextRequest) {
  const user = await currentUser();
  const { jobId } = await req.json();
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { matches: true } });
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });

  const existing = await prisma.application.findFirst({ where: { userId: user.id, jobId } });
  if (existing) return NextResponse.json({ ok: true, application: existing });

  const resume = await getActiveResume(user.id);
  const match = job.matches.find((m) => m.resumeId === resume?.id);
  const app = await prisma.application.create({
    data: {
      userId: user.id, jobId, resumeId: resume?.id,
      company: job.company, title: job.title, jobType: job.jobType, location: job.location,
      workMode: job.workMode, url: job.url, status: "Planning to Apply",
      matchScore: match?.score, dateDiscovered: new Date(),
      events: { create: { type: "status_change", detail: "Created from job feed" } },
    },
  });
  return NextResponse.json({ ok: true, application: app });
}
