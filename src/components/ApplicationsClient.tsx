"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_STATUSES } from "@/lib/defaults";
import { StatusBadge } from "@/components/ui";

type App = {
  id: string; company: string; title: string; status: string; jobType?: string | null;
  url?: string | null; referral: boolean; referralPerson?: string | null; matchScore?: number | null;
  dateApplied?: string | null; notes?: string | null;
};

export default function ApplicationsClient({ apps }: { apps: App[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ company: "", title: "", status: "Applied", jobType: "Full-Time", url: "", referral: false, referralPerson: "" });

  async function patch(id: string, data: any) {
    await fetch("/api/applications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...data }) });
    router.refresh();
  }
  async function del(id: string) {
    if (!confirm("Delete this application?")) return;
    await fetch("/api/applications", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    router.refresh();
  }
  async function add() {
    await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    setAdding(false); setForm({ company: "", title: "", status: "Applied", jobType: "Full-Time", url: "", referral: false, referralPerson: "" });
    router.refresh();
  }
  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const j = await res.json();
    alert(j.ok ? `Imported ${j.imported} applications.` : `Import failed: ${j.error}`);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button className="btn-primary" onClick={() => setAdding(!adding)}>+ Add Application</button>
        <a className="btn-ghost" href="/api/export">⬇ Export CSV</a>
        <label className="btn-ghost cursor-pointer">⬆ Import CSV/XLSX
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={importFile} />
        </label>
      </div>

      {adding && (
        <div className="card p-4 mb-4 grid md:grid-cols-2 gap-3">
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Position / Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {DEFAULT_STATUSES.map((s) => <option key={s.name}>{s.name}</option>)}
          </select>
          <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Link (optional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.referral} onChange={(e) => setForm({ ...form, referral: e.target.checked })} /> Referral</label>
          {form.referral && <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Referral person" value={form.referralPerson} onChange={(e) => setForm({ ...form, referralPerson: e.target.value })} />}
          <div className="md:col-span-2 flex gap-2"><button className="btn-primary" onClick={add}>Save</button><button className="btn-ghost" onClick={() => setAdding(false)}>Cancel</button></div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Company</th><th className="text-left px-4 py-2">Position</th>
              <th className="text-left px-4 py-2">Applied</th><th className="text-left px-4 py-2">Match</th>
              <th className="text-left px-4 py-2">Referral</th><th className="text-left px-4 py-2">Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 font-medium">{a.company}</td>
                <td className="px-4 py-2">{a.url ? <a className="text-brand-700 hover:underline" href={a.url} target="_blank" rel="noreferrer">{a.title}</a> : a.title}</td>
                <td className="px-4 py-2 text-slate-500">{a.dateApplied?.slice(0, 10) || "—"}</td>
                <td className="px-4 py-2">{a.matchScore != null ? `${a.matchScore}%` : "—"}</td>
                <td className="px-4 py-2">{a.referral ? `Yes${a.referralPerson ? ` (${a.referralPerson})` : ""}` : "—"}</td>
                <td className="px-4 py-2">
                  <select value={a.status} onChange={(e) => patch(a.id, { status: e.target.value })}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white">
                    {DEFAULT_STATUSES.map((s) => <option key={s.name}>{s.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 text-right"><button className="text-slate-400 hover:text-red-500" onClick={() => del(a.id)}>✕</button></td>
              </tr>
            ))}
            {apps.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No applications yet. Add one or import your sheet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
