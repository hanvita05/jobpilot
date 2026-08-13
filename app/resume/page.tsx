"use client";
import { useState, useEffect } from "react";

export default function ResumePage() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/resume/list").then((r) => r.json()).then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true); setMsg("Parsing resume and recomputing matches…");
    const fd = new FormData(); fd.append("file", f); fd.append("name", f.name.replace(/\.[^.]+$/, ""));
    const res = await fetch("/api/resume", { method: "POST", body: fd });
    const j = await res.json();
    setMsg(j.ok ? `Uploaded. Detected skills: ${j.profile.skills.join(", ")}. Recomputed ${j.recomputed} matches.` : `Failed: ${j.error}`);
    setBusy(false); load();
  }
  async function setActive(resumeId: string) {
    setBusy(true);
    await fetch("/api/resume", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ resumeId }) });
    setBusy(false); load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Resume</h1>

      <div className="card p-5 mb-4">
        <label className="btn-primary cursor-pointer">Upload PDF / DOCX
          <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={upload} disabled={busy} />
        </label>
        <p className="text-sm text-slate-500 mt-2">Uploading a new resume parses it, makes it your active version, and re-scores every job against it.</p>
        {msg && <div className="mt-3 text-sm text-brand-700">{msg}</div>}
      </div>

      {data?.profile && (
        <div className="card p-5 mb-4">
          <h3 className="font-semibold mb-2">Parsed profile (active)</h3>
          <div className="text-sm text-slate-600 space-y-1">
            <div><b>Name:</b> {data.profile.name}</div>
            <div><b>Education:</b> {data.profile.education.degree} · grad {data.profile.education.gradDate}</div>
            <div><b>Detected skills:</b> {data.profile.skills.join(", ")}</div>
            <div><b>Experience (est.):</b> {data.profile.years} yrs</div>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-semibold mb-3">Versions</h3>
        <div className="space-y-2">
          {(data?.resumes || []).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div><div className="font-medium text-sm">{r.name}</div><div className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</div></div>
              {r.isActive ? <span className="badge bg-green-100 text-green-700">Active</span>
                : <button className="btn-ghost text-xs" onClick={() => setActive(r.id)} disabled={busy}>Set active</button>}
            </div>
          ))}
          {!data?.resumes?.length && <div className="text-slate-500 text-sm">No resumes yet.</div>}
        </div>
      </div>
    </div>
  );
}
