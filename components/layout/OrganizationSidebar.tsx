"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ChartLine,
  ChevronDown,
  Flame,
  Mail,
  Menu,
  Receipt,
  Settings,
  Shield,
  ShieldCheck,
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
  "email-invitations": Mail,
  reports: FileText,
  settings: Settings,
  "change-password": Shield,
  employees: Users,
  reimbursements: Receipt,
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

export default function OrganizationSidebar({ user }: OrganizationSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [executiveExpanded, setExecutiveExpanded] = useState(true);
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
        <button
          type="button"
          onClick={() => setExecutiveExpanded(!executiveExpanded)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
            isExecutiveActive
              ? "tenant-sidebar-link--active font-medium"
              : "tenant-sidebar-link",
          )}
          title={copy.dashboard.navigation["executive-summary"].name}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          {sidebarOpen ? (
            <>
              <span className="flex-1 truncate text-left">
                {copy.dashboard.navigation["executive-summary"].name}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  executiveExpanded ? "rotate-0" : "-rotate-90",
                )}
              />
            </>
          ) : null}
        </button>

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
