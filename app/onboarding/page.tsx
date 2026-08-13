import Link from "next/link";

export default function Onboarding() {
  const steps = [
    ["1. Upload your resume", "We parse it into a structured profile that drives every match.", "/resume", "Go to Resume"],
    ["2. Set your preferences", "Roles, locations, and thresholds — editable any time, no code.", "/settings", "Open Settings"],
    ["3. Pull in jobs", "Ingest from Greenhouse, Lever & GitHub, then browse ranked matches.", "/feed", "See Job Feed"],
  ];
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-1">Welcome to JobPilot</h1>
      <p className="text-slate-500 mb-6">Three steps to your personalized, honest job feed.</p>
      <div className="space-y-3">
        {steps.map(([t, d, href, cta]) => (
          <div key={t} className="card p-5">
            <h3 className="font-semibold">{t}</h3>
            <p className="text-sm text-slate-500 mt-1 mb-3">{d}</p>
            <Link href={href} className="btn-primary">{cta}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
