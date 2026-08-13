import { NormalizedJob } from "./types";

const norm = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(inc|llc|corp|ltd|the)\b/g, "").replace(/\s+/g, " ").trim();

const SOURCE_WORDS = new Set(["linkedin", "indeed", "greenhouse", "lever", "ashby", "handshake", "workday", "glassdoor", "via"]);

// Normalize a title for fingerprinting: drop the company name and any source
// words/suffixes ("Data Analyst, Google — LinkedIn" -> "data analyst").
function titleKey(title: string, company: string): string {
  const companyToks = new Set(norm(company).split(" "));
  return norm(title).split(" ")
    .filter((w) => !companyToks.has(w) && !SOURCE_WORDS.has(w))
    .join(" ").trim();
}

// Canonical fingerprint from company + title + city. Two postings with the
// same fingerprint are treated as the same job across sources (§32).
export function canonicalKey(job: NormalizedJob): string {
  const city = norm(job.location).split(" ").slice(0, 2).join(" ");
  return [norm(job.company), titleKey(job.title, job.company), city].join("::");
}

// Jaccard token similarity on description — a secondary signal for near-dupes.
export function descriptionSimilarity(a: string, b: string): number {
  const toks = (s: string) => new Set(norm(s).split(" ").filter((w) => w.length > 3));
  const A = toks(a), B = toks(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

export interface DedupResult {
  canonical: NormalizedJob;
  sources: { source: string; url: string; sourceId: string }[];
}

// Collapse a raw list into canonical records, keeping every source.
export function dedupe(jobs: NormalizedJob[]): DedupResult[] {
  const map = new Map<string, DedupResult>();
  for (const job of jobs) {
    const key = canonicalKey(job);
    const existing = map.get(key);
    if (existing) {
      if (!existing.sources.some((s) => s.source === job.source && s.sourceId === job.sourceId))
        existing.sources.push({ source: job.source, url: job.url, sourceId: job.sourceId });
      // keep the richest description
      if (job.description.length > existing.canonical.description.length) existing.canonical.description = job.description;
    } else {
      map.set(key, { canonical: { ...job }, sources: [{ source: job.source, url: job.url, sourceId: job.sourceId }] });
    }
  }
  return Array.from(map.values());
}
