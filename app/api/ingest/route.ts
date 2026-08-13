import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser, getProfile, getPreferences, getActiveResume, recomputeAllMatches } from "@/lib/server";
import { GreenhouseConnector, LeverConnector } from "@/lib/connectors/atsBoards";
import { GithubMarkdownConnector } from "@/lib/connectors/github";
import { canonicalKey } from "@/lib/dedup";
import { matchJob } from "@/lib/matcher";
import { DEFAULT_GREENHOUSE_SLUGS, DEFAULT_LEVER_SLUGS, DEFAULT_GITHUB_SOURCES } from "@/lib/defaults";
import { NormalizedJob } from "@/lib/types";

// Pulls from all legitimate sources, dedupes into the DB, computes matches.
// Each source failure is logged, never fatal (§39).
export async function POST(_req: NextRequest) {
  const user = await currentUser();
  const profile = await getProfile(user.id);
  const resume = await getActiveResume(user.id);
  const prefs = await getPreferences(user.id);
  if (!profile || !resume) return NextResponse.json({ error: "set up your resume first" }, { status: 400 });

  const collected: NormalizedJob[] = [];
  const runs: { source: string; ok: boolean; message: string; jobsFound: number }[] = [];

  const tasks: [string, () => Promise<NormalizedJob[]>][] = [
    ["greenhouse", () => GreenhouseConnector.fetch({ companies: DEFAULT_GREENHOUSE_SLUGS })],
    ["lever", () => LeverConnector.fetch({ companies: DEFAULT_LEVER_SLUGS })],
    ...DEFAULT_GITHUB_SOURCES.map((url, i) => [`github-${i}`, () => GithubMarkdownConnector.fetch({ url })] as [string, () => Promise<NormalizedJob[]>]),
  ];

  for (const [name, run] of tasks) {
    try {
      const jobs = await run();
      collected.push(...jobs);
      runs.push({ source: name, ok: true, message: "ok", jobsFound: jobs.length });
    } catch (e: any) {
      runs.push({ source: name, ok: false, message: e.message?.slice(0, 200) || "error", jobsFound: 0 });
    }
    await prisma.ingestionLog.create({ data: runs[runs.length - 1] });
  }

  // Upsert deduped jobs + matches
  let added = 0;
  const seen = new Set<string>();
  for (const nj of collected) {
    const key = canonicalKey(nj);
    if (seen.has(key)) continue; seen.add(key);
    const job = await prisma.job.upsert({
      where: { canonicalKey: key },
      update: { lastChecked: new Date() },
      create: {
        company: nj.company, title: nj.title, location: nj.location, jobType: nj.jobType, workMode: nj.workMode,
        startDate: nj.startDate, postedDate: nj.postedDate ? new Date(nj.postedDate) : null, salary: nj.salary,
        description: nj.description, url: nj.url, canonicalKey: key,
        sources: { create: { source: nj.source, url: nj.url, sourceId: nj.sourceId } },
      },
    });
    const m = matchJob(nj, profile, prefs);
    await prisma.jobMatch.upsert({
      where: { jobId_resumeId: { jobId: job.id, resumeId: resume.id } },
      update: { score: m.score, breakdownJson: JSON.stringify(m.breakdown), strengthsJson: JSON.stringify(m.strengths), gapsJson: JSON.stringify(m.gaps), keywordsJson: JSON.stringify(m.keywords) },
      create: { jobId: job.id, resumeId: resume.id, score: m.score, breakdownJson: JSON.stringify(m.breakdown), strengthsJson: JSON.stringify(m.strengths), gapsJson: JSON.stringify(m.gaps), keywordsJson: JSON.stringify(m.keywords) },
    });
    added++;
  }
  return NextResponse.json({ ok: true, runs, jobsProcessed: added });
}
