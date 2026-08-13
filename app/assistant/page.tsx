"use client";
import { useState } from "react";

const SUGGESTIONS = [
  "What are my strongest matches right now?",
  "Which applications need follow-up?",
  "What skills should I add to improve my matches?",
  "Summarize my application pipeline.",
];

export default function Assistant() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(q: string) {
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput(""); setBusy(true);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q }) });
      const j = await res.json();
      setMessages((m) => [...m, { role: "assistant", text: j.answer || j.error || "No answer." }]);
    } catch { setMessages((m) => [...m, { role: "assistant", text: "Something went wrong." }]); }
    setBusy(false);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">AI Assistant</h1>
      <p className="text-slate-500 mb-4 text-sm">Answers are grounded in your real jobs, applications, and resume. With no API key set, it reports directly from your data; add a key in Settings for free-form answers.</p>

      {messages.length === 0 && (
        <div className="grid gap-2 mb-4">
          {SUGGESTIONS.map((s) => <button key={s} className="card p-3 text-left text-sm hover:bg-slate-50" onClick={() => send(s)}>{s}</button>)}
        </div>
      )}

      <div className="space-y-3 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`p-3 rounded-xl text-sm ${m.role === "user" ? "bg-brand text-white ml-auto max-w-[80%]" : "card max-w-[90%] whitespace-pre-wrap"}`}>{m.text}</div>
        ))}
        {busy && <div className="card p-3 text-sm text-slate-400 max-w-[90%]">Thinking…</div>}
      </div>

      <div className="flex gap-2 sticky bottom-4">
        <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Ask about your search…" value={input}
          onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)} />
        <button className="btn-primary" onClick={() => send(input)} disabled={busy}>Send</button>
      </div>
    </div>
  );
}
