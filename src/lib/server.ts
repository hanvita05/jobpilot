import { prisma } from "./db";
import { DEMO_USER_EMAIL, DEFAULT_PREFERENCES } from "./defaults";
import { ResumeProfile, JobPreferences, NormalizedJob } from "./types";
import { matchJob } from "./matcher";

// Demo single-user resolver. Swap for NextAuth session lookup in production
// (see README "Authentication"): getServerSession() -> user by email.
export async function currentUser() {
  let user = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } });
  if (!user) user = await prisma.user.create({ data: { email: DEMO_USER_EMAIL, name: "Demo User" } });
  return user;
}

export async function getProfile(userId: string): Promise<ResumeProfile | null> {
  const p = await prisma.profile.findUnique({ where: { userId } });
  return p ? (JSON.parse(p.json) as ResumeProfile) : null;
}

export async function getPreferences(userId: string): Promise<JobPreferences> {
  const p = await prisma.preferences.findUnique({ where: { userId } });
  return p ? { ...DEFAULT_PREFERENCES, ...JSON.parse(p.json) } : DEFAULT_PREFERENCES;
}

export async function getActiveResume(userId: string) {
  return prisma.resume.findFirst({ where: { userId, isActive: true }, orderBy: { createdAt: "desc" } });
}

// Recompute every job's match for the active resume (§3: re-run on resume change).
export async function recomputeAllMatches(userId: string) {
  const profile = await getProfile(userId);
  const resume = await getActiveResume(userId);
  const prefs = await getPreferences(userId);
  if (!profile || !resume) return 0;

  const jobs = await prisma.job.findMany({ where: { closed: false } });
  let n = 0;
  for (const j of jobs) {
    const nj: NormalizedJob = {
      company: j.company, title: j.title, location: j.location, jobType: j.jobType as any,
      workMode: j.workMode as any, startDate: j.startDate, postedDate: j.postedDate?.toISOString() || null,
      description: j.description, url: j.url, source: "db", sourceId: j.id,
    };
    const m = matchJob(nj, profile, prefs);
    await prisma.jobMatch.upsert({
      where: { jobId_resumeId: { jobId: j.id, resumeId: resume.id } },
      update: { score: m.score, breakdownJson: JSON.stringify(m.breakdown), strengthsJson: JSON.stringify(m.strengths), gapsJson: JSON.stringify(m.gaps), keywordsJson: JSON.stringify(m.keywords), computedAt: new Date() },
      create: { jobId: j.id, resumeId: resume.id, score: m.score, breakdownJson: JSON.stringify(m.breakdown), strengthsJson: JSON.stringify(m.strengths), gapsJson: JSON.stringify(m.gaps), keywordsJson: JSON.stringify(m.keywords) },
    });
    n++;
  }
  return n;
}

// Feed rows: job + its match for the active resume, filtered/sorted.
export async function getFeed(userId: string, opts: { minScore?: number; sort?: string } = {}) {
  const resume = await getActiveResume(userId);
  if (!resume) return [];
  const dismissed = new Set((await prisma.dismissedJob.findMany({ where: { userId } })).map((d) => d.jobId));
  const saved = new Set((await prisma.savedJob.findMany({ where: { userId } })).map((s) => s.jobId));

  const jobs = await prisma.job.findMany({
    where: { closed: false },
    include: { matches: { where: { resumeId: resume.id } }, sources: true },
  });
  const rows = jobs
    .filter((j) => !dismissed.has(j.id))
    .map((j) => ({ job: j, match: j.matches[0], saved: saved.has(j.id) }))
    .filter((r) => r.match && r.match.score >= (opts.minScore ?? 0));

  if (opts.sort === "newest") rows.sort((a, b) => (b.job.postedDate?.getTime() || 0) - (a.job.postedDate?.getTime() || 0));
  else rows.sort((a, b) => b.match.score - a.match.score); // best match default
  return rows;
}
