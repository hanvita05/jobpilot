import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/server";

// Accepts CSV or XLSX; maps flexible headers to the Application model.
// Designed to ingest your existing Google Sheet without losing rows (§36).
export async function POST(req: NextRequest) {
  const user = await currentUser();
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());

  let rows: Record<string, any>[] = [];
  if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "buffer" });
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  } else {
    const Papa = (await import("papaparse")).default;
    rows = Papa.parse(buf.toString("utf8"), { header: true, skipEmptyLines: true }).data as any[];
  }

  const pick = (r: Record<string, any>, keys: string[]) => {
    for (const k of Object.keys(r)) if (keys.some((t) => k.toLowerCase().includes(t))) return r[k];
    return undefined;
  };

  let imported = 0;
  for (const r of rows) {
    const company = pick(r, ["company"]);
    const title = pick(r, ["position", "title", "role"]);
    if (!company && !title) continue;
    const refRaw = String(pick(r, ["referral"]) ?? "").toLowerCase();
    await prisma.application.create({
      data: {
        userId: user.id, company: company || "Unknown", title: title || "Unknown",
        jobType: pick(r, ["type", "internship", "full"]) || null,
        url: pick(r, ["link", "url"]) || null,
        status: pick(r, ["status"]) || "Applied",
        referral: /yes|y|true|1/.test(refRaw) || (!!refRaw && refRaw !== "no" && refRaw !== "n"),
        referralPerson: /^(yes|no|y|n|true|false)?$/i.test(refRaw) ? null : (pick(r, ["referral"]) || null),
        dateApplied: (() => { const d = pick(r, ["date"]); const t = d ? new Date(d) : null; return t && !isNaN(+t) ? t : null; })(),
        source: "imported",
      },
    });
    imported++;
  }
  return NextResponse.json({ ok: true, imported });
}
