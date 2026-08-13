import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/server";

// GET -> CSV of all applications (mirrors the columns of your Google Sheet).
export async function GET() {
  const user = await currentUser();
  const apps = await prisma.application.findMany({ where: { userId: user.id }, orderBy: { dateApplied: "desc" } });
  const cols = ["Company", "Position/Title", "Date Applied", "Type", "Link", "Status", "Referral", "Referral Person", "Match Score", "Notes"];
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = apps.map((a) => [
    a.company, a.title, a.dateApplied?.toISOString().slice(0, 10) || "", a.jobType || "",
    a.url || "", a.status, a.referral ? "Yes" : "No", a.referralPerson || "", a.matchScore ?? "", a.notes || "",
  ].map(esc).join(","));
  const csv = [cols.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: { "content-type": "text/csv", "content-disposition": `attachment; filename="applications.csv"` },
  });
}
