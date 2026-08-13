import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/server";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  const { jobId, save } = await req.json();
  if (save === false) {
    await prisma.savedJob.deleteMany({ where: { userId: user.id, jobId } });
  } else {
    await prisma.savedJob.upsert({
      where: { userId_jobId: { userId: user.id, jobId } },
      update: {}, create: { userId: user.id, jobId },
    });
  }
  return NextResponse.json({ ok: true });
}
