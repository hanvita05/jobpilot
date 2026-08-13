import { NextResponse } from "next/server";
import { currentUser, getPreferences } from "@/lib/server";

export async function GET() {
  const user = await currentUser();
  const preferences = await getPreferences(user.id);
  return NextResponse.json({ ok: true, preferences });
}
