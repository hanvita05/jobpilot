import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";
import { parseResumeText } from "../src/lib/parseResume";
import { matchJob } from "../src/lib/matcher";
import { canonicalKey } from "../src/lib/dedup";
import { DEFAULT_PREFERENCES, DEMO_USER_EMAIL } from "../src/lib/defaults";
import { NormalizedJob } from "../src/lib/types";

const prisma = new PrismaClient();

// A small, hand-picked DEMO job set so the app is populated even with no network.
// Clearly flagged isDemo=true (§54). Realistic but not represented as live.
const DEMO_JOBS: NormalizedJob[] = [
  { company: "Adobe", title: "Product Analyst, New Grad 2027", location: "San Jose, CA", jobType: "Full-Time", workMode: "Hybrid", startDate: "January 2027", postedDate: "2026-08-11", description: "New grad Product Analyst. Required: SQL, Python, data visualization, product analytics (DAU, retention). Strong communication and stakeholder presentation required. Tableau or Power BI preferred. AWS familiarity a plus.", url: "https://careers.adobe.com/demo/1", source: "greenhouse", sourceId: "demo-adobe-1", salary: "$95k–$115k" },
  { company: "Capital One", title: "Business Analyst Development Program (Rotational) 2027", location: "McLean, VA", jobType: "Rotational", workMode: "Hybrid", startDate: "January 2027", postedDate: "2026-08-10", description: "Rotational program for new grads. Required: SQL, Excel, communication. Preferred: Tableau, Python. Agile project management a plus.", url: "https://capitalone.com/demo/1", source: "github", sourceId: "demo-c1-1", salary: "$85k" },
  { company: "Google", title: "Data Analyst, University Grad 2027", location: "New York, NY", jobType: "Full-Time", workMode: "On-site", startDate: "2027", postedDate: "2026-08-09", description: "Data Analyst. Must have strong SQL and data analysis. Python required. Machine learning exposure helpful. 0-2 years experience.", url: "https://google.com/demo/1", source: "greenhouse", sourceId: "demo-g-1", salary: "$110k–$130k" },
  { company: "Spotify", title: "Associate Product Analyst", location: "Remote", jobType: "Full-Time", workMode: "Remote", startDate: "January 2027", postedDate: "2026-08-08", description: "Associate Product Analyst. Required: SQL, product analytics, A/B testing, data visualization. Preferred: Python. Communication with stakeholders required.", url: "https://spotify.com/demo/1", source: "lever", sourceId: "demo-sp-1" },
  { company: "Nvidia", title: "AI Analyst, Early Career", location: "Santa Clara, CA", jobType: "Full-Time", workMode: "Hybrid", startDate: "2027", postedDate: "2026-08-07", description: "Early-career AI Analyst. Required: Python, LLMs, data analysis. Preferred: machine learning, statistics. Experience benchmarking models a plus.", url: "https://nvidia.com/demo/1", source: "greenhouse", sourceId: "demo-nv-1", salary: "$105k" },
  { company: "Databricks", title: "Senior Data Scientist", location: "Remote", jobType: "Full-Time", workMode: "Remote", startDate: "2026", postedDate: "2026-08-01", description: "Senior data scientist. 5+ years experience required. Spark, AWS, advanced statistics.", url: "https://databricks.com/demo/1", source: "lever", sourceId: "demo-db-1" },
  { company: "McKinsey", title: "Business Intelligence Analyst", location: "Chicago, IL", jobType: "Full-Time", workMode: "Hybrid", startDate: "January 2027", postedDate: "2026-08-06", description: "BI Analyst. Required: SQL, Excel, data visualization, communication. Preferred: Tableau, Power BI. Consulting exposure a plus.", url: "https://mckinsey.com/demo/1", source: "github", sourceId: "demo-mck-1" },
  { company: "Salesforce", title: "Technical Program Manager Intern 2027", location: "San Francisco, CA", jobType: "Internship", workMode: "Hybrid", startDate: "January 2027", postedDate: "2026-08-05", description: "TPM Intern. Required: project management, communication, agile. Preferred: SQL, data analysis. Technical background required.", url: "https://salesforce.com/demo/1", source: "greenhouse", sourceId: "demo-sf-1" },
];

// Your actual tracker rows, read from the screenshot (§36 import, without losing data).
const IMPORTED_APPLICATIONS = [
  { company: "Capital One", title: "Product Development Program Associate - 2027", dateApplied: "2026-07-07", jobType: "Rotational", url: "https://capitalone.com", status: "Denied", referral: true, referralPerson: "Praval" },
  { company: "Capital One", title: "Data Analyst Associate - 2027", dateApplied: "2026-07-10", jobType: "Rotational", url: "https://capitalone.com", status: "Waiting", referral: true, referralPerson: "Praval" },
  { company: "Capital One", title: "Business Analyst Associate - August 2027", dateApplied: "2026-07-10", jobType: "Rotational", url: "https://capitalone.com", status: "Waiting", referral: true, referralPerson: "Praval" },
  { company: "Bosch", title: "Engineer Data (Multiple Positions)", dateApplied: "2026-07-24", jobType: "Full-Time", url: "https://jobs.smartrecruiters.com", status: "Applied", referral: false, referralPerson: null },
  { company: "OpenAI", title: "Quantitative Intelligence Analyst", dateApplied: "2026-07-24", jobType: "Full-Time", url: "https://jobs.ashbyhq.com", status: "Applied", referral: false, referralPerson: null },
];

async function main() {
  const resumeText = readFileSync(path.join(process.cwd(), "data", "seed-resume.txt"), "utf8");
  const profile = parseResumeText(resumeText);

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: { email: DEMO_USER_EMAIL, name: profile.name || "Hanvita Mutyala" },
  });

  await prisma.profile.upsert({
    where: { userId: user.id }, update: { json: JSON.stringify(profile) },
    create: { userId: user.id, json: JSON.stringify(profile) },
  });
  await prisma.preferences.upsert({
    where: { userId: user.id }, update: {},
    create: { userId: user.id, json: JSON.stringify(DEFAULT_PREFERENCES) },
  });
  await prisma.notificationPrefs.upsert({
    where: { userId: user.id }, update: {},
    create: { userId: user.id, gmailAddress: profile.email, phoneNumber: profile.phone },
  });

  const resume = await prisma.resume.create({
    data: {
      userId: user.id, name: "Base Resume (v1)", filePath: "data/seed-resume.pdf",
      mimeType: "application/pdf", isActive: true, parsedJson: JSON.stringify(profile),
    },
  });

  // Seed demo jobs + matches
  for (const nj of DEMO_JOBS) {
    const key = canonicalKey(nj);
    const job = await prisma.job.upsert({
      where: { canonicalKey: key },
      update: {},
      create: {
        company: nj.company, title: nj.title, location: nj.location, jobType: nj.jobType,
        workMode: nj.workMode, startDate: nj.startDate, salary: nj.salary,
        postedDate: nj.postedDate ? new Date(nj.postedDate) : null,
        description: nj.description, url: nj.url, canonicalKey: key, isDemo: true,
        sources: { create: { source: nj.source, url: nj.url, sourceId: nj.sourceId } },
      },
    });
    const m = matchJob(nj, profile, DEFAULT_PREFERENCES);
    await prisma.jobMatch.upsert({
      where: { jobId_resumeId: { jobId: job.id, resumeId: resume.id } },
      update: { score: m.score },
      create: {
        jobId: job.id, resumeId: resume.id, score: m.score,
        breakdownJson: JSON.stringify(m.breakdown), strengthsJson: JSON.stringify(m.strengths),
        gapsJson: JSON.stringify(m.gaps), keywordsJson: JSON.stringify(m.keywords),
      },
    });
  }

  // Import existing tracker
  for (const a of IMPORTED_APPLICATIONS) {
    await prisma.application.create({
      data: {
        userId: user.id, company: a.company, title: a.title, jobType: a.jobType,
        url: a.url, status: a.status, referral: a.referral, referralPerson: a.referralPerson,
        dateApplied: new Date(a.dateApplied), source: "imported",
      },
    });
  }

  console.log(`Seeded user ${user.email}: ${DEMO_JOBS.length} demo jobs, ${IMPORTED_APPLICATIONS.length} imported applications, 1 active resume.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
