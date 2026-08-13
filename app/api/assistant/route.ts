import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser, getProfile, getFeed } from "@/lib/server";
import { getAI } from "@/lib/ai";

// Builds a compact context from the user's real data so answers are grounded,
// never hallucinated. The demo provider reports straight from this context.
export async function POST(req: NextRequest) {
  const user = await currentUser();
  const { question } = await req.json();
  const [profile, apps, feed] = await Promise.all([
    getProfile(user.id),
    prisma.application.findMany({ where: { userId: user.id } }),
    getFeed(user.id, { sort: "best" }),
  ]);

  const context = [
    `Candidate: ${profile?.name}. Skills: ${profile?.skills.join(", ")}. Grad: ${profile?.education.gradDate}.`,
    `Applications (${apps.length}): ` + apps.map((a) => `${a.company}/${a.title} [${a.status}]`).join("; "),
    `Top matches: ` + feed.slice(0, 8).map((f) => `${f.job.company}/${f.job.title} ${f.match.score}%`).join("; "),
  ].join("\n");

  const answer = await getAI().answerAssistant(question, context);
  return NextResponse.json({ ok: true, answer });
}
