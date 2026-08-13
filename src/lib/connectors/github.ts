import { NormalizedJob } from "../types";
import { Connector, ConnectorQuery, classifyJobType, classifyWorkMode } from "./base";

// Parse a markdown link cell: **[Text](url)** -> { text, url }
function parseCell(cell: string): { text: string; url?: string } {
  const m = cell.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (m) return { text: m[1].trim(), url: m[2].trim() };
  return { text: cell.replace(/\*\*/g, "").trim() };
}

// Parses README tables like the jobright-ai "New Grad" repos:
//   | Company | Job Title | Location | Work Model | Date Posted |
// Robust to column-order variation by locating headers.
export const GithubMarkdownConnector: Connector = {
  key: "github", label: "GitHub job list", kind: "curated", legitimate: true,
  async fetch({ url }: ConnectorQuery): Promise<NormalizedJob[]> {
    if (!url) return [];
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GitHub source ${res.status}`);
    const md = await res.text();
    return parseMarkdownJobs(md, url);
  },
};

export function parseMarkdownJobs(md: string, sourceUrl: string): NormalizedJob[] {
  const lines = md.split(/\r?\n/);
  const out: NormalizedJob[] = [];
  let cols: string[] | null = null;
  let idx = { company: 0, title: 1, location: 2, mode: 3, posted: 4 };

  for (const line of lines) {
    if (!line.trim().startsWith("|")) { cols = null; continue; }
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 3) continue;

    // header row
    if (/company/i.test(cells[0]) && cells.some((c) => /title|role|position/i.test(c))) {
      cols = cells.map((c) => c.toLowerCase());
      idx = {
        company: cols.findIndex((c) => /company/.test(c)),
        title: cols.findIndex((c) => /title|role|position/.test(c)),
        location: cols.findIndex((c) => /location/.test(c)),
        mode: cols.findIndex((c) => /model|remote|work/.test(c)),
        posted: cols.findIndex((c) => /date|posted/.test(c)),
      };
      continue;
    }
    if (!cols) continue;                      // not inside a recognized table
    if (/^-+$/.test(cells[0].replace(/[\s|]/g, ""))) continue;   // separator row
    if (cells[0].includes("↳")) continue;     // jobright "same company" continuation rows

    const company = parseCell(cells[idx.company] ?? "");
    const title = parseCell(cells[idx.title] ?? "");
    if (!company.text || !title.text) continue;
    const location = cells[idx.location] ?? "Unknown";
    const mode = cells[idx.mode] ?? "";
    const posted = cells[idx.posted] ?? "";

    out.push({
      company: company.text.replace(/\*/g, ""),
      title: title.text.replace(/\*/g, ""),
      location: location.replace(/\*/g, "") || "Unknown",
      jobType: classifyJobType(title.text),
      workMode: classifyWorkMode(mode + " " + location),
      postedDate: posted || null,
      description: `${title.text} at ${company.text}. Location: ${location}. Work model: ${mode}. (Curated GitHub listing — open the link for the full description.)`,
      url: title.url || company.url || sourceUrl,
      source: "github",
      sourceId: (title.url || `${company.text}-${title.text}`).slice(0, 120),
      startDate: null,
      companyLogo: null,
    });
  }
  return out;
}

// ---- Honest stubs: sources that cannot be legitimately auto-ingested ----
// These exist so the registry is complete and the UI can explain WHY they're
// manual-only, instead of pretending a scraper works (§13 "do not pretend").
function manualStub(key: string, label: string): Connector {
  return {
    key, label, kind: "manual", legitimate: false,
    async fetch() {
      throw new Error(
        `${label} has no public jobs API and its ToS forbids scraping. ` +
        `Use the "Track This Application" browser quick-add on a ${label} posting instead.`
      );
    },
  };
}
export const LinkedInConnector = manualStub("linkedin", "LinkedIn");
export const IndeedConnector = manualStub("indeed", "Indeed");
export const HandshakeConnector = manualStub("handshake", "Handshake");
