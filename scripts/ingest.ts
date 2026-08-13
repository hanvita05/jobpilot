// Standalone ingestion for cron / GitHub Actions:  npm run ingest
// Pulls from all legitimate connectors, dedupes into the DB, recomputes matches.
import { PrismaClient } from "@prisma/client";
import { parseResumeText } from "../src/lib/parseResume";
import { matchJob } from "../src/lib/matcher";
import { canonicalKey } from "../src/lib/dedup";
import { GreenhouseConnector, LeverConnector } from "../src/lib/connectors/atsBoards";
import { GithubMarkdownConnector } from "../src/lib/connectors/github";
import { DEFAULT_PREFERENCES, DEFAULT_GREENHOUSE_SLUGS, DEFAULT_LEVER_SLUGS, DEFAULT_GITHUB_SOURCES, DEMO_USER_EMAIL } from "../src/lib/defaults";
import { NormalizedJob } from "../src/lib/types";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } });
  if (!user) throw new Error("Run `npm run seed` first.");
  const profileRow = await prisma.profile.findUnique({ where: { userId: user.id } });
  const resume = await prisma.resume.findFirst({ where: { userId: user.id, isActive: true } });
  const prefsRow = await prisma.preferences.findUnique({ where: { userId: user.id } });
  if (!profileRow || !resume) throw new Error("Missing profile/resume — run seed.");
  const profile = parseResumeText(JSON.parse(profileRow.json).rawText);
  const prefs = prefsRow ? { ...DEFAULT_PREFERENCES, ...JSON.parse(prefsRow.json) } : DEFAULT_PREFERENCES;

  const collected: NormalizedJob[] = [];
  const sources: [string, () => Promise<NormalizedJob[]>][] = [
    ["greenhouse", () => GreenhouseConnector.fetch({ companies: DEFAULT_GREENHOUSE_SLUGS })],
    ["lever", () => LeverConnector.fetch({ companies: DEFAULT_LEVER_SLUGS })],
    ...DEFAULT_GITHUB_SOURCES.map((url, i) => [`github-${i}`, () => GithubMarkdownConnector.fetch({ url })] as [string, () => Promise<NormalizedJob[]>]),
  ];

  for (const [name, run] of sources) {
    try {
      const jobs = await run();
      collected.push(...jobs);
      await prisma.ingestionLog.create({ data: { source: name, ok: true, message: "ok", jobsFound: jobs.length } });
      console.log(`  ${name}: ${jobs.length} jobs`);
    } catch (e: any) {
      await prisma.ingestionLog.create({ data: { source: name, ok: false, message: e.message?.slice(0, 200), jobsFound: 0 } });
      console.log(`  ${name}: FAILED (${e.message})`);
    }
  }

  const seen = new Set<string>();
  let processed = 0;
  for (const nj of collected) {
    const key = canonicalKey(nj);
    if (seen.has(key)) continue; seen.add(key);
    const job = await prisma.job.upsert({
      where: { canonicalKey: key }, update: { lastChecked: new Date() },
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
    processed++;
  }
  console.log(`Ingest complete: ${processed} unique jobs processed.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
