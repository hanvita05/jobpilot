import { JobPreferences } from "./types";

export const DEFAULT_PREFERENCES: JobPreferences = {
  roles: [
    "Business Analyst", "Data Analyst", "Product Analyst", "Product Management",
    "Technical Product Management", "Project Management", "Program Management",
    "Data Science", "Business Intelligence", "Analytics", "AI Analyst",
    "AI Product", "Technical Analyst", "Analytics Engineer",
  ],
  jobTypes: ["Internship", "Full-Time", "Rotational"],
  earliestStart: "2027-01-01",
  requireStart: false,           // many great postings omit an explicit start; don't over-filter
  locations: ["Princeton, NJ", "New York, NY"],
  geoFilter: false,              // consider nationwide by default
  remoteOk: true,
  minMatchToShow: 55,
  minMatchToAlert: 85,
  maxYearsExperience: 1,
  excludeSenior: true,
  ignoredCompanies: [],
  ignoredKeywords: [],
};

// Status list mirrors your Google Sheet ("Waiting", "Denied") plus a full pipeline.
export const DEFAULT_STATUSES: { name: string; color: string }[] = [
  { name: "Interested", color: "#94a3b8" },
  { name: "Saved", color: "#64748b" },
  { name: "Planning to Apply", color: "#0ea5e9" },
  { name: "Applied", color: "#6366f1" },
  { name: "Waiting", color: "#f59e0b" },          // from your sheet
  { name: "Recruiter Screen", color: "#8b5cf6" },
  { name: "Interview", color: "#a855f7" },
  { name: "Final Interview", color: "#d946ef" },
  { name: "Offer", color: "#22c55e" },
  { name: "Accepted", color: "#16a34a" },
  { name: "Rejected", color: "#ef4444" },
  { name: "Denied", color: "#dc2626" },           // from your sheet
  { name: "Withdrawn", color: "#78716c" },
  { name: "Ghosted", color: "#57534e" },
];

// Board slugs known to expose public Greenhouse/Lever JSON. Editable in Settings.
export const DEFAULT_GREENHOUSE_SLUGS = ["stripe", "databricks", "airbnb", "figma", "robinhood", "coinbase"];
export const DEFAULT_LEVER_SLUGS = ["netflix", "palantir"];
export const DEFAULT_GITHUB_SOURCES = [
  "https://raw.githubusercontent.com/jobright-ai/2026-Data-Analysis-New-Grad/master/README.md",
];

// Single-user demo mode: everything belongs to this user until real auth is wired.
export const DEMO_USER_EMAIL = "hanvitamutyala@gmail.com";
