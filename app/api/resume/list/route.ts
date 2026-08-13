import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser, getProfile } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  const resumes = await prisma.resume.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const profile = await getProfile(user.id);
  return NextResponse.json({ ok: true, resumes, profile });
}
