import { readFileSync } from "fs";
import { parseResumeText } from "../src/lib/parseResume";
import { matchJob } from "../src/lib/matcher";
import { dedupe, canonicalKey } from "../src/lib/dedup";
import { NormalizedJob, JobPreferences } from "../src/lib/types";

const raw = readFileSync("/tmp/resume.txt", "utf8");
const profile = parseResumeText(raw);

console.log("=== PARSED PROFILE ===");
console.log("name:", profile.name);
console.log("email:", profile.email, "| phone:", profile.phone, "| loc:", profile.location);
console.log("grad:", profile.education.gradDate, "(", profile.education.gradYear, ")");
console.log("degree:", profile.education.degree, "| minor:", profile.education.minor, "| cert:", profile.education.certificate);
console.log("years exp (est):", profile.years);
console.log("skills:", profile.skills.join(", "));
console.log("titles:", profile.experienceTitles.slice(0, 6).join(" | "));

const prefs: JobPreferences = {
  roles: ["Data Analyst", "Product Analyst", "Business Analyst", "AI Analyst", "Product Manager"],
  jobTypes: ["Internship", "Full-Time", "Rotational"],
  earliestStart: "2027-01-01", requireStart: true,
  locations: ["Princeton, NJ", "New York, NY", "Remote"], geoFilter: false,
  remoteOk: true, minMatchToShow: 40, minMatchToAlert: 85, maxYearsExperience: 1,
  excludeSenior: true, ignoredCompanies: [], ignoredKeywords: [],
};

const jobs: NormalizedJob[] = [
  {
    company: "Adobe", title: "Product Analyst, New Grad 2027", location: "San Jose, CA",
    jobType: "Full-Time", workMode: "Hybrid", startDate: "January 2027", postedDate: "2026-08-10",
    description: "We seek a new grad product analyst. Required: SQL, Python, data visualization and product analytics (DAU, retention). Strong communication and stakeholder presentation skills required. Experience with Tableau or Power BI preferred. Familiarity with AWS is a plus.",
    url: "https://adobe.com/careers/1", source: "greenhouse", sourceId: "adobe-1",
  },
  {
    company: "Google", title: "Data Analyst, Google — LinkedIn", location: "New York, NY",
    jobType: "Full-Time", workMode: "On-site", startDate: "2027", postedDate: "2026-08-11",
    description: "Data Analyst. Must have strong SQL and data analysis. Python required. Machine learning exposure helpful. 0-2 years experience.",
    url: "https://linkedin.com/jobs/g1", source: "linkedin", sourceId: "g-li-1",
  },
  {
    company: "Google", title: "Data Analyst - Google", location: "New York",
    jobType: "Full-Time", workMode: "On-site", startDate: "2027", postedDate: "2026-08-11",
    description: "Data Analyst. Must have strong SQL and data analysis. Python required.",
    url: "https://boards.greenhouse.io/google/1", source: "greenhouse", sourceId: "g-gh-1",
  },
  {
    company: "Databricks", title: "Senior Data Scientist", location: "Remote",
    jobType: "Full-Time", workMode: "Remote", startDate: "2026", postedDate: "2026-08-01",
    description: "Senior data scientist. 5+ years experience required. Spark, AWS, advanced statistics.",
    url: "https://databricks.com/1", source: "lever", sourceId: "db-1",
  },
  {
    company: "Capital One", title: "Business Analyst Development Program (Rotational) 2027", location: "McLean, VA",
    jobType: "Rotational", workMode: "Hybrid", startDate: "January 2027", postedDate: "2026-08-09",
    description: "Rotational program for new grads. Required: SQL, Excel, communication. Preferred: Tableau, Python. Agile project management a plus.",
    url: "https://capitalone.com/1", source: "github", sourceId: "c1-1",
  },
];

console.log("\n=== DEDUP ===");
const deduped = dedupe(jobs);
console.log(`raw jobs: ${jobs.length} -> canonical: ${deduped.length}`);
for (const d of deduped) {
  if (d.sources.length > 1)
    console.log(`  merged "${d.canonical.company} — ${d.canonical.title}" from: ${d.sources.map((s) => s.source).join(", ")}`);
}

console.log("\n=== MATCHES ===");
for (const d of deduped) {
  const r = matchJob(d.canonical, profile, prefs);
  console.log(`\n${d.canonical.company} — ${d.canonical.title}`);
  if (r.filteredOut) { console.log(`  FILTERED OUT: ${r.filterReason}`); continue; }
  console.log(`  SCORE: ${r.score}%  | role ${r.breakdown.roleAlignment} req ${r.breakdown.requiredSkills} pref ${r.breakdown.preferredSkills} sen ${r.breakdown.seniority} exp ${r.breakdown.experience}`);
  console.log("  keywords:", r.keywords.map((k) => `${k.keyword}${k.inResume ? "✓" : "✗"}(${k.requirement[0]})`).join(" "));
  console.log("  strengths:", r.strengths[0]);
  if (r.gaps.length) console.log("  gaps:", r.gaps.join(" | "));
}

// ---- assertions (no-hallucination + filter correctness) ----
console.log("\n=== ASSERTIONS ===");
let pass = 0, fail = 0;
const check = (name: string, cond: boolean) => { cond ? pass++ : fail++; console.log(`  [${cond ? "PASS" : "FAIL"}] ${name}`); };

const adobe = matchJob(deduped.find((d) => d.canonical.company === "Adobe")!.canonical, profile, prefs);
check("Tableau (in resume) marked present", adobe.keywords.find((k) => k.keyword === "tableau")?.inResume === true);
check("AWS (NOT in resume) marked absent", adobe.keywords.find((k) => k.keyword === "aws")?.inResume === false);
check("AWS surfaced only as a gap, never a strength", adobe.strengths.every((s) => !/aws/i.test(s)) && adobe.gaps.some((g) => /aws/i.test(g)));
check("Adobe is a strong match (>80)", adobe.score > 80);

const senior = matchJob(deduped.find((d) => d.canonical.company === "Databricks")!.canonical, profile, prefs);
check("Senior 5+yr role filtered out", senior.filteredOut === true);

check("Google LinkedIn+Greenhouse deduped to one", deduped.filter((d) => d.canonical.company === "Google").length === 1);
check("SQL present in resume", profile.skills.includes("sql"));
check("Grad year parsed as 2026", profile.education.gradYear === 2026);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
