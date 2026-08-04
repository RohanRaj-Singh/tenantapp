import type { ReactNode } from "react";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { requireClinicPortalUser } from "@/src/modules/clinic-portal/guards/require-clinic-user";
import { ClinicLogoutButton } from "@/src/modules/clinic-portal/components/ClinicLogoutButton";
import NotificationBell from "@/components/notifications/NotificationBell";

export const dynamic = "force-dynamic";

export default async function ClinicPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await requireClinicPortalUser();

  return (
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
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-slate-700">{context.user.name}</p>
              <p className="text-[11px] text-slate-400">{context.user.email}</p>
            </div>
            <NotificationBell claimPathPrefix="/clinic/claims" />
            <ClinicLogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
