// Core domain types — shared by the tested engine, the API layer, and the UI.

export type JobType = "Internship" | "Full-Time" | "Rotational" | "Co-op" | "Unknown";
export type WorkMode = "Remote" | "Hybrid" | "On-site" | "Unknown";

export interface NormalizedJob {
  // Every connector normalizes to this shape (spec §29).
  company: string;
  title: string;
  location: string;
  jobType: JobType;
  workMode: WorkMode;
  startDate?: string | null;      // ISO or free text like "January 2027"
  postedDate?: string | null;     // ISO
  deadline?: string | null;       // ISO
  description: string;
  url: string;
  source: string;                 // "greenhouse" | "lever" | "github" | ...
  sourceId: string;               // stable id within that source
  salary?: string | null;
  companyLogo?: string | null;
}

export interface ResumeProfile {
  // Structured profile extracted from the resume. Source of truth for matching.
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  links: string[];
  education: {
    school?: string;
    degree?: string;
    minor?: string;
    certificate?: string;
    gradDate?: string;            // e.g. "December 2026"
    gradYear?: number;            // 2026
    coursework: string[];
  };
  // Canonical, deduped set of skill tokens found in the resume (lowercased).
  skills: string[];
  // Raw text kept so we can do honest keyword presence checks (§7).
  rawText: string;
  experienceTitles: string[];     // titles held, for seniority/role signals
  bullets: string[];              // every bullet, for keyword alignment
  years: number;                  // rough years of professional experience
}

export interface JobPreferences {
  roles: string[];                // interested role families
  jobTypes: JobType[];
  earliestStart: string;          // ISO date; jobs starting before are filtered if requireStart
  requireStart: boolean;
  locations: string[];            // preferred locations; empty = anywhere
  geoFilter: boolean;
  remoteOk: boolean;
  minMatchToShow: number;         // hide jobs below this in the feed
  minMatchToAlert: number;        // real-time alert threshold (§16)
  maxYearsExperience: number;     // exclude jobs demanding more than this (unless entry-friendly)
  excludeSenior: boolean;
  ignoredCompanies: string[];
  ignoredKeywords: string[];
}

export interface KeywordCheck {
  keyword: string;
  inResume: boolean;
  requirement: "required" | "preferred" | "nice-to-have";
}

export interface MatchBreakdown {
  education: number;
  gradDate: number;
  technicalSkills: number;
  requiredSkills: number;
  preferredSkills: number;
  experience: number;
  roleAlignment: number;
  seniority: number;
  location: number;
}

export interface MatchResult {
  score: number;                  // 0..100
  breakdown: MatchBreakdown;
  strengths: string[];            // "Why you're a strong match"
  gaps: string[];                 // "Potential gaps" — always truthful
  keywords: KeywordCheck[];       // presence table (§8)
  filteredOut: boolean;           // hard-filter says don't show
  filterReason?: string;
}
