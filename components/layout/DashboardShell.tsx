"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import OrganizationSidebar from "@/components/layout/OrganizationSidebar";
import NotificationBell from "@/components/notifications/NotificationBell";
import { getDashboardMeta } from "@/lib/dashboardMockData";
import { useLanguage } from "@/runtime/language/LanguageContext";
import { useTheme } from "@/runtime/theme/useTheme";
import type { TenantUserProfile } from "@/src/modules/tenant-auth/contracts/types";
import { TenantLogoutButton } from "@/src/modules/tenant-auth/components/TenantLogoutButton";

interface DashboardShellProps {
  children: ReactNode;
  user: TenantUserProfile;
}

export default function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const { copy } = useLanguage();
  const activePage = getDashboardMeta(pathname);
  const activePageCopy = copy.dashboard.navigation[activePage.id];

  return (
    <div className="min-h-screen bg-white">
      <div className="flex h-screen w-full bg-white">
        <OrganizationSidebar user={user} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <header
            className="flex min-h-16 items-center justify-between border-b bg-white px-4 sm:px-6"
            style={{ borderColor: theme.borderAccent }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden min-w-0 md:block">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {activePageCopy.headerTitle ?? activePageCopy.name}
                </p>
                <p className="truncate text-xs text-slate-500">{theme.tenantName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="hidden text-right md:block">
                <p className="text-sm font-semibold text-slate-900">{user.username}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <TenantLogoutButton className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" />
            </div>
          </header>

          <main className="tenant-main-canvas flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
