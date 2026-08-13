import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/server";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  const b = await req.json();
  const app = await prisma.application.create({
    data: {
      userId: user.id, company: b.company, title: b.title, jobType: b.jobType || null,
      location: b.location || null, url: b.url || null, status: b.status || "Applied",
      referral: !!b.referral, referralPerson: b.referralPerson || null, notes: b.notes || null,
      source: "manual",
      dateApplied: b.dateApplied ? new Date(b.dateApplied) : new Date(),
      events: { create: { type: "status_change", detail: `Added as ${b.status || "Applied"}` } },
    },
  });
  return NextResponse.json({ ok: true, application: app });
}

export async function PATCH(req: NextRequest) {
  const user = await currentUser();
  const b = await req.json();
  const existing = await prisma.application.findFirst({ where: { id: b.id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data: any = {};
  for (const k of ["status", "notes", "referral", "referralPerson", "nextAction", "recruiter", "salary"]) if (k in b) data[k] = b[k];
  if (b.status && b.status !== existing.status) {
    if (/offer/i.test(b.status)) data.offerDate = new Date();
    if (/reject|denied/i.test(b.status)) data.rejectionDate = new Date();
  }
  const app = await prisma.application.update({ where: { id: b.id }, data });
  if (b.status && b.status !== existing.status)
    await prisma.applicationEvent.create({ data: { applicationId: b.id, type: "status_change", detail: `${existing.status} → ${b.status}` } });
  return NextResponse.json({ ok: true, application: app });
}

export async function DELETE(req: NextRequest) {
  const user = await currentUser();
  const { id } = await req.json();
  await prisma.applicationEvent.deleteMany({ where: { application: { id, userId: user.id } } });
  await prisma.application.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
