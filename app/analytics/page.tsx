import Link from "next/link";
import { BarChart3, ShieldCheck, TrendingUp } from "lucide-react";

const ANALYTICS_CARDS = [
  {
    title: "Executive Summary",
    description: "Review the protected organization-wide overview with current wellbeing metrics and filterable rollups.",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Domain Deep Dives",
    description: "Open domain dashboards for clinical risk, psychological safety, workload, leadership, and satisfaction.",
    href: "/dashboard/clinical-risk-index",
    icon: TrendingUp,
  },
  {
    title: "Protected Session Model",
    description: "Analytics access is isolated to the current tenant owner session and current tenant lifecycle state.",
    href: "/settings",
    icon: ShieldCheck,
  },
] as const;

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
          Analytics Access
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">
          Protected organization analytics with clean tenant boundaries.
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          This runtime surface exposes analytics only for the authenticated tenant dashboard owner. Public survey pages remain outside this session boundary.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {ANALYTICS_CARDS.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(15,118,110,0.1)]">
                <Icon className="h-5 w-5 text-teal-700" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
