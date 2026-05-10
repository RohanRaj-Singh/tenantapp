"use client";

import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { usePathname } from "next/navigation";
import OrganizationSidebar from "@/components/layout/OrganizationSidebar";
import ProtectedRoute from "@/components/Wrapper/ProtectedRoute";
import { getDashboardMeta } from "@/lib/dashboardMockData";
import { useTheme } from "@/runtime/theme/useTheme";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const theme = useTheme();
  const activePage = getDashboardMeta(pathname);

  return (
    <ProtectedRoute>
      <div className="tenant-dashboard-shell min-h-screen pt-24">
        <div className="mx-auto flex max-w-[1440px] gap-4 px-4 pb-6 sm:px-6 lg:gap-6 lg:px-8">
          <OrganizationSidebar />

          <div
            className="flex min-h-[calc(100vh-7rem)] min-w-0 flex-1 flex-col overflow-hidden rounded-[2rem] border bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)]"
            style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
          >
            <header
              className="border-b px-6 py-5 lg:px-8"
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
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                      {activePage.headerTitle ?? activePage.name}
                    </h1>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                      {activePage.description}
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-full border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: theme.borderAccent, backgroundColor: theme.surfaceAccent, color: theme.linkColor }}
                >
                  Organization Dashboard
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8" style={{ background: theme.cardGradient }}>
              <div className="mx-auto max-w-7xl">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
