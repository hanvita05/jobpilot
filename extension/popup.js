// Prefill from the current tab, then POST to the local JobPilot instance.
const API = "http://localhost:3000/api/applications";

async function prefill() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  document.getElementById("url").value = tab.url || "";
  // Best-effort title parse: many boards use "Job Title - Company | Board"
  const t = (tab.title || "").split(/[-|·—]/).map(s => s.trim());
  if (t[0]) document.getElementById("title").value = t[0];
  if (t[1]) document.getElementById("company").value = t[1];
}
prefill();

document.getElementById("save").addEventListener("click", async () => {
  const body = {
    company: document.getElementById("company").value,
    title: document.getElementById("title").value,
    url: document.getElementById("url").value,
    status: "Planning to Apply",
  };
  const s = document.getElementById("status");
  try {
    const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    s.textContent = res.ok ? "✓ Added to JobPilot!" : "Failed — is JobPilot running on localhost:3000?";
  } catch { s.textContent = "Could not reach JobPilot (localhost:3000)."; }
});
