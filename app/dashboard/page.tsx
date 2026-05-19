import ExecutiveSummaryPage from "@/components/dashboard/ExecutiveSummaryPage";
import { Activity, ShieldCheck, UserRound } from "lucide-react";
import { requireCurrentTenantUser } from "@/src/modules/tenant-auth/utils/current-tenant-user";
import { getTenantRuntimeConfigForTenantId } from "@/src/modules/tenant-auth/utils/request-tenant";

export default async function DashboardPage() {
  const context = await requireCurrentTenantUser({ nextPath: "/dashboard" });
  const runtimeConfig = await getTenantRuntimeConfigForTenantId(context.user.tenantId);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
              Dashboard Home
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
              {runtimeConfig?.tenant.name ?? "Tenant Dashboard"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Secure access is now active for dashboards, analytics, reports, and future exports while public survey routes remain outside the authentication boundary.
            </p>
          </div>

          <div className="w-full rounded-3xl border border-teal-100 bg-teal-50 px-4 py-4 sm:w-auto sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              Signed In
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{context.user.username}</p>
            <p className="text-sm text-slate-600">{context.user.email}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(15,118,110,0.1)]">
            <Activity className="h-5 w-5 text-teal-700" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-slate-900">Quick Analytics Summary</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Executive metrics below are now protected by the tenant session lifecycle and middleware gate.
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(2,132,199,0.1)]">
            <UserRound className="h-5 w-5 text-sky-700" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-slate-900">Authenticated Identity</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The current dashboard owner identity is restored after refresh and reused across protected routes and APIs.
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(20,83,45,0.1)]">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-slate-900">Session Isolation</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Tenant cookies and tenant session records stay isolated from super admin authentication.
          </p>
        </div>
      </section>

      <ExecutiveSummaryPage />
    </div>
  );
}
