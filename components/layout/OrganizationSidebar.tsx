"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ChartLine,
  ChevronDown,
  Flame,
  HelpCircle,
  Menu,
  Receipt,
  Settings,
  Shield,
  Smile,
  FileText,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  dashboardNavigation,
  type TenantSurfacePageId,
} from "@/lib/dashboardMockData";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/runtime/language/LanguageContext";
import { useTheme } from "@/runtime/theme/useTheme";
import type { TenantUserProfile } from "@/src/modules/tenant-auth/contracts/types";

const iconMap: Record<TenantSurfacePageId, LucideIcon> = {
  "executive-summary": BarChart3,
  "clinical-risk-index": Flame,
  "psychological-safety": TrendingUp,
  "workload-efficiency": ChartLine,
  "leadership-alignment": Users,
  "satisfaction-engagement": Smile,
  reports: FileText,
  settings: Settings,
  "change-password": Shield,
  employees: Users,
  reimbursements: Receipt,
  requests: HelpCircle,
};

interface OrganizationSidebarProps {
  user: TenantUserProfile;
}

const EXECUTIVE_IDS: TenantSurfacePageId[] = [
  "clinical-risk-index",
  "psychological-safety",
  "workload-efficiency",
  "leadership-alignment",
  "satisfaction-engagement",
];

const EXEC_EXPANDED_STORAGE_KEY = "tenantapp.executiveSidebarExpanded";

/**
 * Session-scoped cache of the Executive Summary submenu toggle.
 *
 * The sidebar remounts on every cross-section navigation (its mount point is
 * not a persistent layout), so component state alone would reset to the
 * default-open value. This module-level cache lets a remount initialize from
 * the last known value synchronously — no reopen flash. It stays `null` on
 * the server (only the client handler/effect below mutate it), so SSR and
 * the first hydration always agree on the default.
 */
let cachedExecutiveExpanded: boolean | null = null;

function readStoredExecutiveExpanded(): boolean {
  if (cachedExecutiveExpanded !== null) {
    return cachedExecutiveExpanded;
  }
  try {
    const raw = window.localStorage.getItem(EXEC_EXPANDED_STORAGE_KEY);
    cachedExecutiveExpanded = raw === null ? true : raw === "1";
  } catch {
    /* localStorage unavailable */
    cachedExecutiveExpanded = true;
  }
  return cachedExecutiveExpanded;
}

export default function OrganizationSidebar({ user }: OrganizationSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [executiveExpanded, setExecutiveExpanded] = useState<boolean>(
    // `null` = not yet known this session (server render / first hydration):
    // fall back to the default-open state, matching what SSR rendered.
    () => cachedExecutiveExpanded ?? true,
  );
  const pathname = usePathname();
  const { copy } = useLanguage();
  const theme = useTheme();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // The sidebar can remount during navigation (its mount point is not a
  // persistent layout), which would reset the Executive Summary submenu to
  // its default-open state on every menu click. Restore the persisted toggle
  // on mount, and keep the session cache in sync so remounts start from the
  // right value. Storage is only WRITTEN in the toggle handler: writing it
  // from an effect clobbers the stored value with the pre-restore default
  // before this effect reads it back (StrictMode double-invokes mount
  // effects in dev, which made a collapsed submenu reopen on navigation).
  useEffect(() => {
    setExecutiveExpanded(readStoredExecutiveExpanded());
  }, []);

  function toggleExecutiveExpanded(): void {
    const next = !executiveExpanded;
    cachedExecutiveExpanded = next;
    setExecutiveExpanded(next);
    try {
      window.localStorage.setItem(EXEC_EXPANDED_STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* localStorage unavailable */
    }
  }

  const isChildActive = EXECUTIVE_IDS.some((id) =>
    pathname.startsWith(`/dashboard/${id}`),
  );
  const isExecutiveActive = pathname === "/dashboard" || isChildActive;

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === href
      : pathname.startsWith(href);
  }

  function renderExecutiveSummary() {
    const execItem = dashboardNavigation[0];
    const Icon = iconMap["executive-summary"];

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <Link
            href={execItem.href}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
              isExecutiveActive
                ? "tenant-sidebar-link--active font-medium"
                : "tenant-sidebar-link",
            )}
            title={copy.dashboard.navigation["executive-summary"].name}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen ? (
              <span className="flex-1 truncate text-left">
                {copy.dashboard.navigation["executive-summary"].name}
              </span>
            ) : null}
          </Link>
          {sidebarOpen ? (
            <button
              type="button"
              onClick={toggleExecutiveExpanded}
              aria-expanded={executiveExpanded}
              className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
              aria-label="Toggle Executive Summary submenu"
              title={executiveExpanded ? "Collapse submenu" : "Expand submenu"}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  executiveExpanded ? "rotate-0" : "-rotate-90",
                )}
              />
            </button>
          ) : null}
        </div>

        {sidebarOpen && executiveExpanded ? (
          <div className="ml-2 space-y-0.5 border-l border-slate-200 pl-3">
            {execItem.children?.map((child) => {
              const ChildIcon = iconMap[child.id];

              return (
                <Link
                  key={child.id}
                  href={child.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive(child.href)
                      ? "tenant-sidebar-link--active font-medium"
                      : "tenant-sidebar-link",
                  )}
                  title={copy.dashboard.navigation[child.id].name}
                >
                  <ChildIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {copy.dashboard.navigation[child.id].name}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  function renderFlatItem(
    item: (typeof dashboardNavigation)[number],
  ) {
    const Icon = iconMap[item.id];

    return (
      <Link
        key={item.id}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
          isActive(item.href)
            ? "tenant-sidebar-link--active font-medium"
            : "tenant-sidebar-link",
        )}
        title={copy.dashboard.navigation[item.id].name}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {sidebarOpen ? (
          <span className="truncate">{copy.dashboard.navigation[item.id].name}</span>
        ) : null}
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-white transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {sidebarOpen ? (
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden">
              <Image
                src={theme.logoUrl}
                alt={copy.dashboard.shell.organizationDashboard}
                fill
                sizes="40px"
                unoptimized
                className="object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {theme.tenantName}
              </p>
              <p className="truncate text-xs text-slate-500">{user.username}</p>
            </div>
          </Link>
        ) : (
          <div className="relative mx-auto flex h-10 w-10 items-center justify-center overflow-hidden">
            <Image
              src={theme.logoUrl}
              alt={theme.tenantName}
              fill
              sizes="40px"
              unoptimized
              className="object-contain"
            />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {renderExecutiveSummary()}

        <div className="border-t border-slate-100 pt-1">
          {dashboardNavigation.slice(1).map((item) => renderFlatItem(item))}
        </div>
      </nav>

      <div className="border-t p-4">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden w-full items-center justify-center rounded-lg border border-slate-200 py-2 text-slate-600 transition hover:bg-slate-50 md:flex"
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
