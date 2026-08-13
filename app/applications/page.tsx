import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/server";
import ApplicationsClient from "@/components/ApplicationsClient";
import { Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Applications() {
  const user = await currentUser();
  const raw = await prisma.application.findMany({ where: { userId: user.id }, orderBy: { dateApplied: "desc" } });
  const apps = raw.map((a) => ({
    id: a.id, company: a.company, title: a.title, status: a.status, jobType: a.jobType,
    url: a.url, referral: a.referral, referralPerson: a.referralPerson, matchScore: a.matchScore,
    dateApplied: a.dateApplied?.toISOString() || null, notes: a.notes,
  }));
  const active = apps.filter((a) => !/reject|denied|withdrawn|ghosted|accepted/i.test(a.status)).length;
  const interviews = apps.filter((a) => /interview/i.test(a.status)).length;
  const offers = apps.filter((a) => /offer|accepted/i.test(a.status)).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Applications</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Total" value={apps.length} />
        <Stat label="Active" value={active} />
        <Stat label="Interviews" value={interviews} />
        <Stat label="Offers" value={offers} />
      </div>
      <ApplicationsClient apps={apps} />
    </div>
  );
}
