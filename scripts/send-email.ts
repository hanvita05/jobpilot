import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userEmail = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!userEmail || !appPassword) {
    throw new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD in environment variables.");
  }

  // Fetch top job matches from database (posted after June 1, 2026)
  const MIN_DATE = new Date("2026-06-01T00:00:00.000Z");
  const matches = await prisma.jobMatch.findMany({
    where: {
      job: {
        postedDate: { gte: MIN_DATE },
      },
    },
    include: { job: true },
    orderBy: { score: "desc" },
    take: 10,
  });

  if (matches.length === 0) {
    console.log("No new matching jobs found to send.");
    return;
  }

  // Build simple HTML body
  const jobListHtml = matches
    .map(
      (m) => `
    <div style="margin-bottom: 16px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
      <h3 style="margin: 0 0 4px 0;"><a href="${m.job.url}" style="color: #2563eb;">${m.job.title}</a></h3>
      <p style="margin: 0; color: #555;"><strong>${m.job.company}</strong> • ${m.job.location || "Remote/Unspecified"}</p>
      <p style="margin: 4px 0 0 0; color: #16a34a; font-weight: bold;">Match Score: ${m.score}%</p>
    </div>`
    )
    .join("");

  const html = `
    <h2>Your Daily Job Digest</h2>
    <p>Here are your top job matches from JobPilot:</p>
    ${jobListHtml}
  `;

  // Set up Nodemailer transport
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: userEmail,
      pass: appPassword,
    },
  });

  console.log(`Sending email digest to ${userEmail}...`);

  await transporter.sendMail({
    from: `"JobPilot" <${userEmail}>`,
    to: userEmail,
    subject: `JobPilot Digest: ${matches.length} Top Job Matches`,
    html,
  });

  console.log("Email sent successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());