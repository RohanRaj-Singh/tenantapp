import type { ReactNode } from "react";
import Link from "next/link";
import { Stethoscope, UserCircle } from "lucide-react";
import { requireClinicPortalUser } from "@/src/modules/clinic-portal/guards/require-clinic-user";
import { ClinicLogoutButton } from "@/src/modules/clinic-portal/components/ClinicLogoutButton";
import { CLINIC_CHANGE_PASSWORD_PATH } from "@/src/modules/clinic-portal/guards/routes";
import NotificationBell from "@/components/notifications/NotificationBell";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";

export const dynamic = "force-dynamic";

export default async function ClinicPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await requireClinicPortalUser();

  return (
    <RealtimeProvider claimPathPrefix="/clinic/claims">
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/clinic/claims" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
                <Stethoscope className="h-4 w-4 text-teal-600" />
              </span>
              <span className="text-sm font-semibold text-teal-700">Clinic Portal</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href={CLINIC_CHANGE_PASSWORD_PATH}
                className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 transition-colors hover:border-slate-300 hover:bg-slate-100 sm:flex"
              >
                <UserCircle className="h-4 w-4 shrink-0 text-slate-500" />
                <div className="text-right">
                  <p className="text-xs font-medium leading-tight text-slate-700">{context.user.name}</p>
                  <p className="text-[10px] leading-tight text-slate-400">{context.user.email}</p>
                </div>
              </Link>
              <NotificationBell claimPathPrefix="/clinic/claims" />
              <ClinicLogoutButton />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </RealtimeProvider>
  );
}
