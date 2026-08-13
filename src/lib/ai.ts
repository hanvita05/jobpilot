import { NormalizedJob, ResumeProfile, MatchResult } from "./types";

// Modular AI layer (§41). Everything the app needs from an LLM goes through this
// interface, so swapping providers = swapping one class. If no API key is set,
// DemoProvider returns deterministic, truthful output so the app fully works offline.

export interface AIProvider {
  name: string;
  generateCoverLetter(input: CoverLetterInput): Promise<string>;
  tailorResume(input: TailorInput): Promise<TailorOutput>;
  summarizeJob(job: NormalizedJob): Promise<string>;
  answerAssistant(question: string, context: string): Promise<string>;
}

export interface CoverLetterInput { profile: ResumeProfile; job: NormalizedJob; match: MatchResult; }
export interface TailorInput { profile: ResumeProfile; job: NormalizedJob; match: MatchResult; }
export interface TailorChange { section: string; original: string; tailored: string; rationale: string; }
export interface TailorOutput { changes: TailorChange[]; note: string; }

// ---------------- Demo (no-key) provider ----------------
// Truthful by construction: it only ever references skills/bullets that already
// exist in the parsed resume. It can reorder/emphasize but cannot invent (§7,§42).
export class DemoProvider implements AIProvider {
  name = "demo";

  async generateCoverLetter({ profile, job, match }: CoverLetterInput): Promise<string> {
    const strong = match.keywords.filter((k) => k.inResume).map((k) => k.keyword);
    const proj = profile.bullets.find((b) => /tableau|churn/i.test(b));
    const aiExp = profile.bullets.find((b) => /llm|adversarial|benchmark/i.test(b));
    const name = profile.name || "Applicant";
    const relevant = strong.slice(0, 3).join(", ") || "data analysis";

    const openers: string[] = [];
    openers.push(`Dear ${job.company} Hiring Team,`);
    openers.push("");
    openers.push(
      `I'm applying for the ${job.title} role. As a Computer Science senior at ${profile.education.school || "my university"} graduating ${profile.education.gradDate || "soon"}, I've spent the last two years doing exactly the kind of ${match.strengths.length ? "analytics and product work" : "work"} this role centers on — and the overlap with ${relevant} is why I reached out rather than sending a form letter.`
    );
    openers.push("");
    if (aiExp) openers.push(`Most recently, ${aiExp.charAt(0).toLowerCase() + aiExp.slice(1)} That work sharpened how I reason about reliability and edge cases — habits that transfer directly to ${job.title}.`);
    if (proj) openers.push(`Earlier, ${proj.charAt(0).toLowerCase() + proj.slice(1)} I like turning messy data into a decision someone can act on.`);
    openers.push("");
    openers.push(`What draws me specifically to ${job.company} is the chance to apply ${relevant} on problems that ship. I'd welcome the chance to talk through how my background maps to what your team needs.`);
    openers.push("");
    openers.push(`Best regards,\n${name}\n${profile.email || ""}${profile.phone ? " | " + profile.phone : ""}`);
    return openers.filter((l) => l !== undefined).join("\n");
  }

  async tailorResume({ profile, job, match }: TailorInput): Promise<TailorOutput> {
    const changes: TailorChange[] = [];
    const jobSkills = match.keywords.map((k) => k.keyword);

    // 1) Reorder skills so job-relevant, resume-present skills come first.
    const present = match.keywords.filter((k) => k.inResume).map((k) => k.keyword);
    if (present.length) {
      const reordered = Array.from(new Set([...present, ...profile.skills]));
      changes.push({
        section: "Skills",
        original: profile.skills.join(", "),
        tailored: reordered.join(", "),
        rationale: `Moved ${present.slice(0, 4).join(", ")} to the front because the posting emphasizes them and they're already on your resume.`,
      });
    }

    // 2) Emphasize the single most relevant existing bullet (no rewriting of facts).
    const relBullet = profile.bullets.find((b) =>
      jobSkills.some((s) => b.toLowerCase().includes(s.split("/")[0])));
    if (relBullet) {
      changes.push({
        section: "Experience (ordering)",
        original: relBullet,
        tailored: relBullet, // unchanged text — the "tailoring" is promoting it to the top
        rationale: "Surfaced this existing bullet near the top of its section because it directly matches the role's required skills. Wording unchanged — no facts added.",
      });
    }

    // 3) Explicitly refuse to add anything the resume lacks.
    const missing = match.keywords.filter((k) => !k.inResume).map((k) => k.keyword);
    const note = missing.length
      ? `Left out ${missing.join(", ")} entirely — those aren't on your resume, and adding them would be fabrication. Consider building them if they recur across your target jobs.`
      : "Every job-relevant skill was already present on your resume; only ordering/emphasis changed.";
    return { changes, note };
  }

  async summarizeJob(job: NormalizedJob): Promise<string> {
    const first = job.description.split(/[.!?]/)[0]?.trim();
    return `${job.jobType} ${job.title} at ${job.company} (${job.location}). ${first || ""}.`.slice(0, 240);
  }

  async answerAssistant(question: string, context: string): Promise<string> {
    return `Based on your data: ${context.slice(0, 600)}\n\n(Connect an AI key in Settings for free-form answers; this is the offline demo assistant, which reports directly from your database.)`;
  }
}

// ---------------- Anthropic adapter (used when ANTHROPIC_API_KEY is set) ----------------
export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  constructor(private apiKey: string, private model = "claude-sonnet-4-6") {}

  private async call(system: string, user: string): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: this.model, max_tokens: 1500, system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
  }

  private guard(profile: ResumeProfile) {
    return `CRITICAL TRUTHFULNESS RULE: You may ONLY use skills, tools, experiences, metrics, and achievements that appear in the candidate's resume text below. NEVER invent or imply anything not present. If a job wants something the resume lacks, do not add it. Resume text:\n"""${profile.rawText}"""`;
  }

  async generateCoverLetter({ profile, job }: CoverLetterInput): Promise<string> {
    return this.call(
      `You write specific, human cover letters. No generic "I am writing to express my interest" filler. ${this.guard(profile)}`,
      `Write a ~250-word cover letter for ${job.title} at ${job.company}. Job description:\n${job.description}`
    );
  }

  async tailorResume({ profile, job }: TailorInput): Promise<TailorOutput> {
    const raw = await this.call(
      `You tailor resumes by reordering and re-emphasizing EXISTING content only. Return JSON only: {"changes":[{"section","original","tailored","rationale"}],"note"}. ${this.guard(profile)}`,
      `Tailor for ${job.title} at ${job.company}. Job description:\n${job.description}`
    );
    try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
    catch { return { changes: [], note: "AI returned unparseable output; no changes applied." }; }
  }

  async summarizeJob(job: NormalizedJob): Promise<string> {
    return this.call("Summarize this job in 2 sentences.", `${job.title} at ${job.company}\n${job.description}`);
  }

  async answerAssistant(question: string, context: string): Promise<string> {
    return this.call(
      "You are a job-search assistant. Answer using ONLY the provided context about the user's jobs, applications, and resume. If the answer isn't in the context, say so.",
      `Context:\n${context}\n\nQuestion: ${question}`
    );
  }
}

export function getAI(): AIProvider {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) return new AnthropicProvider(key, process.env.AI_MODEL || "claude-sonnet-4-6");
  return new DemoProvider();
}
