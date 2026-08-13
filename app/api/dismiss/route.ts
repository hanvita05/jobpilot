import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/server";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  const { jobId, reason } = await req.json();
  await prisma.dismissedJob.upsert({
    where: { userId_jobId: { userId: user.id, jobId } },
    update: { reason }, create: { userId: user.id, jobId, reason },
  });
  return NextResponse.json({ ok: true });
}
