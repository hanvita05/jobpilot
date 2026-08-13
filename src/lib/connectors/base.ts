import { NormalizedJob } from "../types";

// Every source implements this. The rest of the app only ever sees NormalizedJob,
// so it doesn't care where a job came from (§29).
export interface Connector {
  key: string;                 // "greenhouse"
  label: string;               // "Greenhouse"
  kind: "api" | "feed" | "curated" | "manual";
  legitimate: boolean;         // false => needs manual/quick-add, cannot auto-ingest legally
  // `query` is a free-form config: for Greenhouse/Lever it's a company slug list.
  fetch(query: ConnectorQuery): Promise<NormalizedJob[]>;
}

export interface ConnectorQuery {
  companies?: string[];        // board slugs for greenhouse/lever/ashby
  url?: string;                // raw url for github/company pages
  keywords?: string[];
}

export function classifyJobType(text: string): NormalizedJob["jobType"] {
  const t = text.toLowerCase();
  if (/rotational|rotation program|development program/.test(t)) return "Rotational";
  if (/co-?op/.test(t)) return "Co-op";
  if (/intern/.test(t)) return "Internship";
  if (/full[- ]?time|new ?grad|associate|analyst|full time/.test(t)) return "Full-Time";
  return "Unknown";
}

export function classifyWorkMode(text: string): NormalizedJob["workMode"] {
  const t = text.toLowerCase();
  if (/remote/.test(t)) return "Remote";
  if (/hybrid/.test(t)) return "Hybrid";
  if (/on-?site|in-?office|in person/.test(t)) return "On-site";
  return "Unknown";
}
