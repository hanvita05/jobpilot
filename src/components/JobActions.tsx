"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JobActions({ jobId, url, saved = false, compact = false }: { jobId: string; url: string; saved?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [isSaved, setSaved] = useState(saved);
  const [busy, setBusy] = useState("");

  async function post(path: string, body: any) {
    setBusy(path);
    await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy("");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button className="btn-ghost" onClick={() => { post("/api/saved", { jobId, save: !isSaved }); setSaved(!isSaved); }}>
        {isSaved ? "❤️ Saved" : "🤍 Save"}
      </button>
      <a className="btn-primary" href={url} target="_blank" rel="noreferrer"
         onClick={() => post("/api/applications/from-job", { jobId, ask: true })}>
        Apply ↗
      </a>
      <button className="btn-ghost" disabled={busy !== ""} onClick={() => post("/api/dismiss", { jobId })}>✕ Not interested</button>
      {!compact && <>
        <button className="btn-ghost" disabled={busy !== ""} onClick={() => post("/api/tailor", { jobId })}>✨ Tailor</button>
        <button className="btn-ghost" disabled={busy !== ""} onClick={() => post("/api/cover-letter", { jobId })}>✉ Cover letter</button>
      </>}
    </div>
  );
}
