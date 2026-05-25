import { FileText, LockKeyhole, TimerReset } from "lucide-react";
import { getServerTenantCopy } from "@/runtime/language/server";

const REPORT_NOTES = [
  {
    title: "Protected runtime reports",
    description: "Reports are only reachable from an authenticated tenant session and are blocked immediately on logout or expiry.",
    icon: FileText,
  },
  {
    title: "Session expiry aware",
    description: "Stale sessions are invalidated server-side so report access cannot continue on expired or mismatched cookies.",
    icon: TimerReset,
  },
  {
    title: "Scoped to one owner account",
    description: "The current implementation intentionally keeps report access limited to the single tenant dashboard owner.",
    icon: LockKeyhole,
  },
] as const;

export default async function ReportsPage() {
  const copy = await getServerTenantCopy();
  const reportsCopy = copy.dashboard.reportsPage;
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
          {reportsCopy.chip}
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">
          {reportsCopy.title}
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          {reportsCopy.description}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {REPORT_NOTES.map((note, index) => {
          const Icon = note.icon;
          const translatedNote = reportsCopy.cards[index];

          return (
            <div
              key={translatedNote.title}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(15,118,110,0.1)]">
                <Icon className="h-5 w-5 text-teal-700" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{translatedNote.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{translatedNote.description}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
