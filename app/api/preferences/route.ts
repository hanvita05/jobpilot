import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser, getPreferences, recomputeAllMatches } from "@/lib/server";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  const patch = await req.json();
  const current = await getPreferences(user.id);
  const next = { ...current, ...patch };
  await prisma.preferences.upsert({
    where: { userId: user.id }, update: { json: JSON.stringify(next) },
    create: { userId: user.id, json: JSON.stringify(next) },
  });
  // Preference changes affect filtering/scoring, so recompute (§21).
  const n = await recomputeAllMatches(user.id);
  return NextResponse.json({ ok: true, recomputed: n });
}
