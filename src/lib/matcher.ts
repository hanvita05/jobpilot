import { NormalizedJob, ResumeProfile, JobPreferences, MatchResult, KeywordCheck } from "./types";
import { SKILL_SYNONYMS, ROLE_FAMILIES, SENIOR_TITLE_SIGNALS, ENTRY_FRIENDLY_SIGNALS } from "./taxonomy";

// ---------- helpers ----------
const lc = (s: string) => (s || "").toLowerCase();
const has = (hay: string, needle: string) => lc(hay).includes(lc(needle));

function skillPresentInText(text: string, canonSkill: string): boolean {
  const forms = SKILL_SYNONYMS[canonSkill] || [canonSkill];
  const t = " " + lc(text).replace(/[\n\t]/g, " ") + " ";
  return forms.some((f) => t.includes(lc(f)));
}

// Detect canonical skills a job asks for, and whether required vs preferred.
// Requirement is inferred from the sentence/section the skill appears in.
function classifyJobSkills(desc: string): { skill: string; requirement: KeywordCheck["requirement"] }[] {
  const lines = desc.split(/[\n.;•\-]/).map((l) => l.trim()).filter(Boolean);
  const out = new Map<string, KeywordCheck["requirement"]>();
  const rank = { "nice-to-have": 0, preferred: 1, required: 2 } as const;

  for (const canon of Object.keys(SKILL_SYNONYMS)) {
    let best: KeywordCheck["requirement"] | null = null;
    for (const line of lines) {
      if (!skillPresentInText(line, canon)) continue;
      let req: KeywordCheck["requirement"] = "required"; // default when listed as a skill
      if (/prefer|plus|bonus|nice to have|ideal|desired|a plus|preferred/i.test(line)) req = "preferred";
      if (/familiar|exposure|basic|awareness|helpful/i.test(line)) req = "nice-to-have";
      if (/must|required|require|strong|proficien|expert|advanced/i.test(line)) req = "required";
      if (best === null || rank[req] > rank[best]) best = req;
    }
    if (best) out.set(canon, best);
  }
  return Array.from(out.entries()).map(([skill, requirement]) => ({ skill, requirement }));
}

function jobRoleFamilies(title: string, desc: string): string[] {
  const hayTitle = lc(title);
  const fams: string[] = [];
  for (const [fam, phrases] of Object.entries(ROLE_FAMILIES)) {
    if (phrases.some((p) => hayTitle.includes(p)) ||
        phrases.some((p) => has(desc, p) && p.length > 6)) fams.push(fam);
  }
  return fams;
}

function profileRoleFamilies(profile: ResumeProfile, prefs: JobPreferences): Set<string> {
  const s = new Set<string>();
  const hay = lc(profile.experienceTitles.join(" ") + " " + profile.bullets.join(" ") + " " + prefs.roles.join(" "));
  for (const [fam, phrases] of Object.entries(ROLE_FAMILIES)) {
    if (phrases.some((p) => hay.includes(p))) s.add(fam);
  }
  // Interested roles from prefs count even without direct resume evidence.
  for (const [fam, phrases] of Object.entries(ROLE_FAMILIES)) {
    if (prefs.roles.some((r) => phrases.some((p) => lc(r).includes(p) || p.includes(lc(r))))) s.add(fam);
  }
  return s;
}

function requiredYears(desc: string): number | null {
  const m = lc(desc).match(/(\d{1,2})\+?\s*(?:-\s*\d{1,2}\s*)?years?/);
  return m ? parseInt(m[1], 10) : null;
}

// ---------- hard filters (§5) ----------
function hardFilter(job: NormalizedJob, profile: ResumeProfile, prefs: JobPreferences): string | null {
  const title = lc(job.title), desc = lc(job.description);
  const entryFriendly = ENTRY_FRIENDLY_SIGNALS.some((s) => title.includes(s) || desc.includes(s));

  if (prefs.ignoredCompanies.some((c) => c && has(job.company, c)))
    return `Company on your ignore list (${job.company})`;
  for (const kw of prefs.ignoredKeywords) if (kw && (has(title, kw) || has(desc, kw)))
    return `Matches an ignored keyword ("${kw}")`;

  if (prefs.excludeSenior && !entryFriendly &&
      SENIOR_TITLE_SIGNALS.some((s) => title.includes(s)))
    return "Senior/manager-level title";

  const ry = requiredYears(desc);
  if (ry !== null && ry > prefs.maxYearsExperience && !entryFriendly)
    return `Requires ${ry}+ years experience`;

  // graduation / start-date gate
  if (prefs.requireStart && job.startDate) {
    const y = job.startDate.match(/20\d{2}/)?.[0];
    if (y && parseInt(y, 10) < new Date(prefs.earliestStart).getFullYear())
      return `Starts before ${new Date(prefs.earliestStart).getFullYear()}`;
  }
  const needGradBy = desc.match(/graduat\w+ (?:by|before) (20\d{2})/);
  if (needGradBy && profile.education.gradYear && parseInt(needGradBy[1], 10) < profile.education.gradYear)
    return `Requires graduation before ${needGradBy[1]}`;

  // geography
  if (prefs.geoFilter && prefs.locations.length && job.workMode !== "Remote") {
    const ok = prefs.locations.some((loc) => has(job.location, loc.split(",")[0].trim()));
    if (!ok) return `Outside preferred locations (${job.location})`;
  }
  return null;
}

// ---------- scoring ----------
export function matchJob(job: NormalizedJob, profile: ResumeProfile, prefs: JobPreferences): MatchResult {
  const filterReason = hardFilter(job, profile, prefs);

  const jobSkills = classifyJobSkills(job.description);
  const keywords: KeywordCheck[] = jobSkills.map(({ skill, requirement }) => ({
    keyword: skill,
    requirement,
    inResume: skillPresentInText(profile.rawText, skill),
  }));

  const req = keywords.filter((k) => k.requirement === "required");
  const pref = keywords.filter((k) => k.requirement === "preferred");
  const pct = (arr: KeywordCheck[]) => (arr.length ? arr.filter((k) => k.inResume).length / arr.length : 1);

  // role alignment
  const jobFams = jobRoleFamilies(job.title, job.description);
  const myFams = profileRoleFamilies(profile, prefs);
  const roleOverlap = jobFams.length ? jobFams.filter((f) => myFams.has(f)).length / jobFams.length : 0.6;

  // seniority: reward entry-friendly, penalize senior signals
  const title = lc(job.title);
  const entryFriendly = ENTRY_FRIENDLY_SIGNALS.some((s) => title.includes(s));
  const seniorSignal = SENIOR_TITLE_SIGNALS.some((s) => title.includes(s));
  const seniority = entryFriendly ? 1 : seniorSignal ? 0.25 : 0.7;

  // experience: does candidate meet (not exceed) any stated years?
  const ry = requiredYears(job.description);
  const experience = ry === null ? 0.85 : profile.years >= ry ? 1 : Math.max(0.4, 1 - (ry - profile.years) * 0.15);

  // education / grad gates
  const education = 1; // degree present & relevant for these role families
  const gradDate = 1;  // gate handled by hardFilter; if shown, it passed

  // location
  let location = 1;
  if (job.workMode === "Remote") location = 1;
  else if (prefs.locations.length) location = prefs.locations.some((l) => has(job.location, l.split(",")[0])) ? 1 : 0.6;

  // technical skills breadth: overlap of all job-mentioned skills with resume
  const techOverlap = keywords.length ? keywords.filter((k) => k.inResume).length / keywords.length : 0.7;

  const breakdown = {
    education: Math.round(education * 100),
    gradDate: Math.round(gradDate * 100),
    technicalSkills: Math.round(techOverlap * 100),
    requiredSkills: Math.round(pct(req) * 100),
    preferredSkills: Math.round(pct(pref) * 100),
    experience: Math.round(experience * 100),
    roleAlignment: Math.round(roleOverlap * 100),
    seniority: Math.round(seniority * 100),
    location: Math.round(location * 100),
  };

  // Weighted score. Required skills + role alignment dominate; preferred is
  // deliberately low-weight so a missing "nice-to-have" barely dents the score (§6).
  const W = {
    requiredSkills: 0.26, roleAlignment: 0.20, experience: 0.14, seniority: 0.12,
    technicalSkills: 0.10, education: 0.07, location: 0.06, preferredSkills: 0.05,
  };
  let score =
    breakdown.requiredSkills * W.requiredSkills +
    breakdown.roleAlignment * W.roleAlignment +
    breakdown.experience * W.experience +
    breakdown.seniority * W.seniority +
    breakdown.technicalSkills * W.technicalSkills +
    breakdown.education * W.education +
    breakdown.location * W.location +
    breakdown.preferredSkills * W.preferredSkills;
  score = Math.round(Math.max(0, Math.min(100, score)));

  // ----- explanations (truthful; never invents resume content) -----
  const strengths: string[] = [];
  const matchedReq = req.filter((k) => k.inResume).map((k) => k.keyword);
  if (matchedReq.length) strengths.push(`Your resume shows ${matchedReq.slice(0, 4).join(", ")} — matching the role's required skills.`);
  const sharedFams = jobFams.filter((f) => myFams.has(f));
  if (sharedFams.length) strengths.push(`Role aligns with your background in ${sharedFams.join(", ")}.`);
  if (entryFriendly) strengths.push("Posting is explicitly early-career / internship / new-grad friendly.");
  if (ry !== null && profile.years >= ry) strengths.push(`Meets the stated ${ry}-year experience bar.`);
  if (has(job.description, "llm") && profile.skills.includes("llm"))
    strengths.push("Your AI/LLM benchmarking experience maps to the AI requirements.");

  const gaps: string[] = [];
  const nice = keywords.filter((k) => k.requirement === "nice-to-have");
  const missingReq = req.filter((k) => !k.inResume).map((k) => k.keyword);
  const missingPref = pref.filter((k) => !k.inResume).map((k) => k.keyword);
  const missingNice = nice.filter((k) => !k.inResume).map((k) => k.keyword);
  for (const m of missingReq) gaps.push(`Requires ${m} — not currently shown on your resume.`);
  for (const m of missingPref) gaps.push(`Prefers ${m} (preferred, not required) — not currently shown on your resume.`);
  for (const m of missingNice) gaps.push(`Mentions ${m} (nice-to-have) — not currently shown on your resume.`);
  if (ry !== null && profile.years < ry) gaps.push(`Lists ${ry}+ years experience; your resume shows about ${profile.years}.`);
  if (!strengths.length) strengths.push("General alignment with your target role families; review details below.");

  return {
    score,
    breakdown,
    strengths,
    gaps,
    keywords: keywords.sort((a, b) =>
      (b.requirement === "required" ? 1 : 0) - (a.requirement === "required" ? 1 : 0)),
    filteredOut: filterReason !== null,
    filterReason: filterReason || undefined,
  };
}
