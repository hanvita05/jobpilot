import { ResumeProfile } from "./types";
import { SKILL_SYNONYMS } from "./taxonomy";

const MONTHS =
  "(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)";

function findEmail(t: string) {
  return t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}
function findPhone(t: string) {
  return t.match(/(\+?\d[\d\s().-]{8,}\d)/)?.[0]?.trim();
}
function findLinks(t: string) {
  return Array.from(new Set((t.match(/(linkedin\.com\/[^\s|]+|github\.com\/[^\s|]+|https?:\/\/[^\s|]+)/gi) || [])
    .map((s) => s.replace(/[.,]$/, ""))));
}

// Detect which canonical skills are present, using the synonym map. Word-ish
// boundaries so "r" doesn't match "for". Returns canonical tokens only.
export function detectSkills(text: string): string[] {
  const t = " " + text.toLowerCase().replace(/[\n\t]/g, " ") + " ";
  const found = new Set<string>();
  for (const [canon, forms] of Object.entries(SKILL_SYNONYMS)) {
    for (const form of forms) {
      const f = form.toLowerCase();
      // for very short tokens rely on the padded/spaced synonyms already given
      const idx = t.indexOf(f);
      if (idx >= 0) { found.add(canon); break; }
    }
  }
  return Array.from(found).sort();
}

function extractGrad(text: string): { gradDate?: string; gradYear?: number } {
  // Prefer an explicit "expected" or the later date in an education range.
  const rangeRe = new RegExp(`${MONTHS}\\.?\\s+\\d{4}\\s*[–-]\\s*(${MONTHS}\\.?\\s+\\d{4}|Present)`, "i");
  const m = text.match(rangeRe);
  if (m) {
    const end = m[0].split(/[–-]/).pop()!.trim();
    const y = end.match(/\d{4}/)?.[0];
    if (y) return { gradDate: end, gradYear: parseInt(y, 10) };
  }
  const single = text.match(new RegExp(`(expected[^\\n]*?)?${MONTHS}\\.?\\s+(20\\d{2})`, "i"));
  if (single) return { gradDate: `${single[2]} ${single[3]}`, gradYear: parseInt(single[3], 10) };
  return {};
}

function extractTitles(text: string): string[] {
  // Lines that look like a role title (Title Case, no trailing period, short).
  const titles: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.length > 60) continue;
    if (/(intern|analyst|engineer|fellow|scientist|manager|developer|associate|consultant)/i.test(line) &&
        !/●|•|:/.test(line) && /[A-Z]/.test(line[0] || "")) {
      titles.push(line.replace(/\s{2,}.*$/, "").trim());
    }
  }
  return Array.from(new Set(titles)).slice(0, 12);
}

function estimateYears(text: string): number {
  // Count month-year ranges in EXPERIENCE and sum durations (rough, capped).
  const re = new RegExp(`${MONTHS}\\.?\\s+(20\\d{2})\\s*[–-]\\s*(Present|${MONTHS}\\.?\\s+20\\d{2})`, "gi");
  const monthIdx = (s: string) => ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]
    .findIndex((m) => s.toLowerCase().startsWith(m));
  let months = 0;
  const now = new Date();
  for (const m of text.matchAll(re)) {
    const startY = parseInt(m[2], 10);
    const startM = monthIdx(m[1]);
    let endY: number, endM: number;
    if (/present/i.test(m[3])) { endY = now.getFullYear(); endM = now.getMonth(); }
    else {
      endY = parseInt(m[3].match(/20\d{2}/)![0], 10);
      endM = monthIdx(m[3].match(new RegExp(MONTHS, "i"))![0]);
    }
    if (endY > now.getFullYear()) continue; // skip education / "expected grad" ranges
    const d = (endY - startY) * 12 + (endM - startM);
    if (d > 0 && d < 72) months += d;
  }
  return Math.round((months / 12) * 10) / 10;
}

export function parseResumeText(rawText: string): ResumeProfile {
  const text = rawText.replace(/\u0000/g, "").trim();
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find(Boolean) || "";
  const { gradDate, gradYear } = extractGrad(text);

  const bullets = text.split(/\r?\n/).map((l) => l.replace(/^[\s●•\-*]+/, "").trim())
    .filter((l) => l.length > 25);

  const coursework = (text.match(/Relevant Coursework:([^\n]+)/i)?.[1] || "")
    .split(/,/).map((s) => s.trim()).filter(Boolean);

  return {
    name: /^[A-Z][A-Za-z.'-]+(\s+[A-Z][A-Za-z.'-]+)+$/.test(firstLine) ? firstLine : undefined,
    email: findEmail(text),
    phone: findPhone(text),
    location: text.match(/^([A-Za-z .]+,\s*[A-Z]{2})/m)?.[1]?.trim(),
    links: findLinks(text),
    education: {
      school: text.match(/([A-Z][A-Za-z]+ University[^\n]*)/)?.[1]?.split("  ")[0]?.trim(),
      degree: text.match(/(B\.?S\.?[^\n,]*|Bachelor[^\n,]*)/)?.[1]?.trim(),
      minor: text.match(/Minor in ([A-Za-z ]+)/)?.[1]?.trim(),
      certificate: text.match(/Certifica\w+ in ([A-Za-z ]+)/)?.[1]?.trim(),
      gradDate, gradYear, coursework,
    },
    skills: detectSkills(text),
    rawText: text,
    experienceTitles: extractTitles(text),
    bullets,
    years: estimateYears(text),
  };
}
