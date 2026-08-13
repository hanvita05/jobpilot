import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser, getFeed } from "@/lib/server";

// Assembles the 9AM digest payload (§15). Delivery (email/SMS) is wired to
// Gmail API / Twilio in production — see README. Here we return the payload
// and log it, so the endpoint is real and testable without credentials.
export async function GET(_req: NextRequest) {
  const user = await currentUser();
  const feed = await getFeed(user.id, { sort: "best" });
  const top = feed.filter((f) => f.match.score >= 80).slice(0, 5);
  const apps = await prisma.application.findMany({ where: { userId: user.id } });
  const followUps = apps.filter((a) => a.status === "Waiting" || a.status === "Applied");

  const digest = {
    date: new Date().toISOString().slice(0, 10),
    newTopMatches: top.map((t) => ({ company: t.job.company, title: t.job.title, score: t.match.score, url: t.job.url })),
    followUps: followUps.map((a) => ({ company: a.company, title: a.title, status: a.status })),
    summary: `${top.length} strong matches today; ${followUps.length} applications awaiting follow-up.`,
  };
  return NextResponse.json({ ok: true, digest,
    note: "Delivery via Gmail API / Twilio requires credentials (see README). This endpoint returns the payload a cron job would send.",
  });
}
