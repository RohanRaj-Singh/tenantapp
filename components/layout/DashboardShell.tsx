"use client";

import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { usePathname } from "next/navigation";
import OrganizationSidebar from "@/components/layout/OrganizationSidebar";
import { getDashboardMeta } from "@/lib/dashboardMockData";
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
  const activePage = getDashboardMeta(pathname);

  return (
    <div className="tenant-dashboard-shell min-h-screen pt-24">
      <div className="mx-auto flex max-w-[1440px] gap-3 px-3 pb-4 sm:px-6 sm:pb-6 lg:gap-6 lg:px-8">
        <OrganizationSidebar user={user} />

        <div
          className="flex min-h-[calc(100dvh-7rem)] min-w-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:rounded-[2rem]"
          style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
        >
          <header
            className="border-b px-4 py-4 sm:px-6 sm:py-5 lg:px-8"
            style={{ borderColor: theme.borderAccent, background: theme.headerGradient }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ background: theme.brandGradient, color: theme.onPrimaryColor }}
                >
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {theme.tenantName}
                  </p>
                  <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {activePage.headerTitle ?? activePage.name}
                  </h1>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                    {activePage.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 md:items-end">
                <div
                  className="rounded-full border px-3 py-1.5 text-xs font-medium"
                  style={{
                    borderColor: theme.borderAccent,
                    backgroundColor: theme.surfaceAccent,
                    color: theme.linkColor,
                  }}
                >
                  Organization Dashboard
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm font-semibold text-slate-900">{user.username}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
                <TenantLogoutButton
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>
          </header>

          <main
            className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8"
            style={{ background: theme.cardGradient }}
          >
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
