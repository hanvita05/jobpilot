"use client";
import { useState, useEffect } from "react";

export default function Settings() {
  const [prefs, setPrefs] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch("/api/settings").then((r) => r.json()).then((j) => setPrefs(j.preferences)).catch(() => {}); }, []);

  async function save() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/preferences", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(prefs) });
    const j = await res.json();
    setMsg(j.ok ? `Saved. Recomputed ${j.recomputed} matches.` : "Save failed.");
    setBusy(false);
  }
  async function ingest() {
    setBusy(true); setMsg("Ingesting from Greenhouse, Lever, and GitHub sources…");
    const res = await fetch("/api/ingest", { method: "POST" });
    const j = await res.json();
    setMsg(j.ok ? `Processed ${j.jobsProcessed} jobs. ` + j.runs.map((r: any) => `${r.source}: ${r.ok ? r.jobsFound : "failed"}`).join(", ") : `Ingest failed: ${j.error}`);
    setBusy(false);
  }
  async function digest() {
    const res = await fetch("/api/digest"); const j = await res.json();
    setMsg(`Digest preview: ${j.digest.summary}`);
  }

  if (!prefs) return <div className="text-slate-500">Loading settings…</div>;
  const arr = (k: string) => (prefs[k] || []).join(", ");
  const setArr = (k: string, v: string) => setPrefs({ ...prefs, [k]: v.split(",").map((s) => s.trim()).filter(Boolean) });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>

      <div className="card p-5 mb-4 space-y-4">
        <h3 className="font-semibold">Job Preferences</h3>
        <label className="block text-sm">Target roles<textarea className="w-full border rounded-lg px-3 py-2 text-sm mt-1" rows={2} value={arr("roles")} onChange={(e) => setArr("roles", e.target.value)} /></label>
        <label className="block text-sm">Preferred locations<input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={arr("locations")} onChange={(e) => setArr("locations", e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Min match to show
            <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={prefs.minMatchToShow} onChange={(e) => setPrefs({ ...prefs, minMatchToShow: +e.target.value })} /></label>
          <label className="text-sm">Alert threshold
            <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={prefs.minMatchToAlert} onChange={(e) => setPrefs({ ...prefs, minMatchToAlert: +e.target.value })} /></label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.excludeSenior} onChange={(e) => setPrefs({ ...prefs, excludeSenior: e.target.checked })} /> Exclude senior roles</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.remoteOk} onChange={(e) => setPrefs({ ...prefs, remoteOk: e.target.checked })} /> Remote OK</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.geoFilter} onChange={(e) => setPrefs({ ...prefs, geoFilter: e.target.checked })} /> Filter by location</label>
        </div>
        <label className="block text-sm">Ignore companies<input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={arr("ignoredCompanies")} onChange={(e) => setArr("ignoredCompanies", e.target.value)} /></label>
        <button className="btn-primary" onClick={save} disabled={busy}>Save preferences</button>
      </div>

      <div className="card p-5 mb-4 space-y-3">
        <h3 className="font-semibold">Job Sources</h3>
        <p className="text-sm text-slate-500">Pull new jobs from Greenhouse + Lever public APIs and curated GitHub lists. LinkedIn/Indeed/Handshake can't be auto-ingested (no public API / ToS) — use the browser quick-add instead.</p>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-primary" onClick={ingest} disabled={busy}>Run ingestion now</button>
          <button className="btn-ghost" onClick={digest}>Preview daily digest</button>
        </div>
      </div>

      <div className="card p-5 space-y-2">
        <h3 className="font-semibold">Notifications</h3>
        <p className="text-sm text-slate-500">9AM email/SMS digest and real-time alerts require Gmail API + Twilio credentials and a deployed cron. See the README for setup. The digest payload endpoint works now without credentials.</p>
      </div>

      {msg && <div className="mt-4 text-sm text-brand-700">{msg}</div>}
    </div>
  );
}
