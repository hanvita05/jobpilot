import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "JobPilot — AI Job Search Assistant", description: "Your personal AI recruiting assistant" };

const NAV = [
  ["Dashboard", "/"], ["Job Feed", "/feed"], ["Saved", "/saved"], ["Applications", "/applications"],
  ["Companies", "/companies"], ["Resume", "/resume"], ["Cover Letters", "/cover-letters"],
  ["Skills Gap", "/skills-gap"], ["Analytics", "/analytics"], ["AI Assistant", "/assistant"], ["Settings", "/settings"],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <aside className="hidden md:flex w-56 flex-col border-r border-slate-200 bg-white p-3 gap-1 sticky top-0 h-screen">
            <div className="px-2 py-3 font-bold text-lg text-brand-700 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-brand text-white grid place-items-center text-sm">JP</span>
              JobPilot
            </div>
            <nav className="flex flex-col gap-0.5 mt-2">
              {NAV.map(([label, href]) => (
                <Link key={href} href={href} className="nav-link">{label}</Link>
              ))}
            </nav>
            <div className="mt-auto text-[11px] text-slate-400 px-2">Demo mode · single user</div>
          </aside>
          <main className="flex-1 min-w-0">
            {/* Mobile top nav */}
            <div className="md:hidden flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 text-sm sticky top-0 z-10">
              {NAV.map(([label, href]) => (
                <Link key={href} href={href} className="px-2 py-1 whitespace-nowrap text-slate-600">{label}</Link>
              ))}
            </div>
            <div className="p-4 md:p-8 max-w-6xl mx-auto">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
