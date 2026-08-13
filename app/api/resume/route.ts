import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser, recomputeAllMatches } from "@/lib/server";
import { parseResumeText } from "@/lib/parseResume";

export const dynamic = "force-dynamic";

// Accepts a multipart upload, extracts text (pdf-parse / mammoth), parses to a
// ResumeProfile, stores the version, marks it active, and recomputes matches.
export async function POST(req: NextRequest) {
  const user = await currentUser();
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const name = (form.get("name") as string) || "Resume";
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  let text = "";
  try {
    if (file.type.includes("pdf")) {
      const pdf = (await import("pdf-parse")).default;
      text = (await pdf(buf)).text;
    } else if (file.name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer: buf })).value;
    } else {
      text = buf.toString("utf8");
    }
  } catch (e: any) {
    return NextResponse.json({ error: `Could not parse file: ${e.message}` }, { status: 400 });
  }

  // --- REMOVED THE DISK WRITE LOGIC THAT WAS CAUSING THE ENOENT ERROR ---
  const filePath = `uploads/${Date.now()}-${file.name}`; // Virtual identifier instead of a local disk path

  const profile = parseResumeText(text);
  await prisma.resume.updateMany({ where: { userId: user.id }, data: { isActive: false } });
  
  const resume = await prisma.resume.create({
    data: { 
      userId: user.id, 
      name, 
      filePath, 
      mimeType: file.type || "application/octet-stream", 
      isActive: true, 
      parsedJson: JSON.stringify(profile) 
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id }, 
    update: { json: JSON.stringify(profile) }, 
    create: { userId: user.id, json: JSON.stringify(profile) },
  });

  const n = await recomputeAllMatches(user.id);
  return NextResponse.json({ ok: true, resumeId: resume.id, profile, recomputed: n });
}

// Set an existing version active
export async function PATCH(req: NextRequest) {
  const user = await currentUser();
  const { resumeId } = await req.json();
  const r = await prisma.resume.findFirst({ where: { id: resumeId, userId: user.id } });
  if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.resume.updateMany({ where: { userId: user.id }, data: { isActive: false } });
  await prisma.resume.update({ where: { id: resumeId }, data: { isActive: true } });
  await prisma.profile.upsert({ where: { userId: user.id }, update: { json: r.parsedJson }, create: { userId: user.id, json: r.parsedJson } });
  const n = await recomputeAllMatches(user.id);
  return NextResponse.json({ ok: true, recomputed: n });
}