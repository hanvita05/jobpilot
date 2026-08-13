import { NormalizedJob } from "../types";
import { Connector, ConnectorQuery, classifyJobType, classifyWorkMode } from "./base";

const strip = (html: string) => (html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&amp;|&#39;/g, " ").replace(/\s+/g, " ").trim();

// Greenhouse exposes a public JSON board per company:
//   https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
// This is a legitimate, documented endpoint — no scraping.
export const GreenhouseConnector: Connector = {
  key: "greenhouse", label: "Greenhouse", kind: "api", legitimate: true,
  async fetch({ companies = [] }: ConnectorQuery): Promise<NormalizedJob[]> {
    const out: NormalizedJob[] = [];
    for (const slug of companies) {
      try {
        const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
        if (!res.ok) continue;
        const data = await res.json();
        for (const j of data.jobs || []) {
          const desc = strip(j.content || "");
          out.push({
            company: slug, title: j.title, location: j.location?.name || "Unknown",
            jobType: classifyJobType(j.title + " " + desc), workMode: classifyWorkMode(j.location?.name + " " + desc),
            postedDate: j.updated_at || null, description: desc, url: j.absolute_url,
            source: "greenhouse", sourceId: String(j.id), startDate: null,
          });
        }
      } catch { /* source unavailable — skip, logged by caller */ }
    }
    return out;
  },
};

// Lever public postings API:
//   https://api.lever.co/v0/postings/{slug}?mode=json
export const LeverConnector: Connector = {
  key: "lever", label: "Lever", kind: "api", legitimate: true,
  async fetch({ companies = [] }: ConnectorQuery): Promise<NormalizedJob[]> {
    const out: NormalizedJob[] = [];
    for (const slug of companies) {
      try {
        const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`);
        if (!res.ok) continue;
        const data = await res.json();
        for (const j of data || []) {
          const desc = strip(j.descriptionPlain || j.description || "");
          out.push({
            company: slug, title: j.text, location: j.categories?.location || "Unknown",
            jobType: classifyJobType(j.text + " " + (j.categories?.commitment || "")),
            workMode: classifyWorkMode(desc + " " + (j.workplaceType || "")),
            postedDate: j.createdAt ? new Date(j.createdAt).toISOString() : null,
            description: desc, url: j.hostedUrl, source: "lever", sourceId: j.id, startDate: null,
          });
        }
      } catch { /* skip */ }
    }
    return out;
  },
};
