import { TenantPasswordForm } from "@/src/modules/tenant-auth/components/TenantPasswordForm";
import { getServerTenantCopy } from "@/runtime/language/server";
import { requireCurrentTenantUser } from "@/src/modules/tenant-auth/utils/current-tenant-user";

export default async function SettingsPage() {
  const context = await requireCurrentTenantUser({ nextPath: "/settings" });
  const copy = await getServerTenantCopy();
  const settingsCopy = copy.dashboard.settingsPage;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
          {settingsCopy.chip}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          {settingsCopy.title}
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {settingsCopy.email}
            </p>
            <p className="mt-2 text-base font-medium text-slate-900">{context.user.email}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {settingsCopy.username}
            </p>
            <p className="mt-2 text-base font-medium text-slate-900">{context.user.username}</p>
          </div>
        </div>
      </section>

      <TenantPasswordForm
        title={settingsCopy.passwordTitle}
        description={settingsCopy.passwordDescription}
        submitLabel={settingsCopy.passwordSubmit}
      />
    </div>
  );
}
