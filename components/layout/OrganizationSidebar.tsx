"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ChartLine,
  Flame,
  Mail,
  Menu,
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
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  dashboardNavigation,
  tenantAccessNavigation,
  type TenantSurfacePageId,
} from "@/lib/dashboardMockData";
import { useLanguage } from "@/runtime/language/LanguageContext";
import { hexToRgba } from "@/runtime/theme/themeUtils";
import { useTheme } from "@/runtime/theme/useTheme";
import type { TenantUserProfile } from "@/src/modules/tenant-auth/contracts/types";
import { TenantLogoutButton } from "@/src/modules/tenant-auth/components/TenantLogoutButton";

const iconMap: Record<TenantSurfacePageId, LucideIcon> = {
  "executive-summary": BarChart3,
  "clinical-risk-index": Flame,
  "psychological-safety": TrendingUp,
  "workload-efficiency": ChartLine,
  "leadership-alignment": Users,
  "satisfaction-engagement": Smile,
  "email-invitations": Mail,
  analytics: ShieldCheck,
  reports: FileText,
  settings: Settings,
  "change-password": Shield,
};

interface OrganizationSidebarProps {
  user: TenantUserProfile;
}

function renderNavSection(
  pathname: string,
  expanded: boolean,
  closeMobileSidebar: () => void,
  theme: ReturnType<typeof useTheme>,
  items: typeof dashboardNavigation,
  labels: ReturnType<typeof useLanguage>["copy"]["dashboard"]["navigation"],
) {
  return items.map((item) => {
    const Icon = iconMap[item.id];
    const isActive =
      item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
    const label = labels[item.id].name;

    return (
      <Link
        key={item.id}
        href={item.href}
        title={label}
        onClick={closeMobileSidebar}
        className={cn(
          "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all",
          expanded ? "justify-start" : "justify-center",
          isActive ? "text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        )}
        style={
          isActive
            ? {
                backgroundColor: theme.primaryColor,
                color: theme.onPrimaryColor,
                boxShadow: `0 20px 36px -28px ${theme.strongAccent}`,
              }
            : undefined
        }
      >
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition-colors",
            isActive
              ? "text-white"
              : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-900",
          )}
          style={
            isActive
              ? {
                  backgroundColor: hexToRgba(theme.onPrimaryColor, 0.14),
                  color: theme.onPrimaryColor,
                }
              : undefined
          }
        >
          <Icon className="h-4 w-4" />
        </div>
        {expanded ? <span className="truncate font-medium">{label}</span> : null}
      </Link>
    );
  });
}

export default function OrganizationSidebar({ user }: OrganizationSidebarProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const { copy } = useLanguage();
  const [isDesktop, setIsDesktop] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const expanded = isDesktop ? !isCollapsed : isMobileOpen;

  const closeMobileSidebar = () => {
    if (!isDesktop) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {!isDesktop && !isMobileOpen ? (
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="fixed left-3 top-28 z-40 inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-white text-slate-700 shadow-sm sm:left-4"
          aria-label={copy.dashboard.shell.openNavigation}
          style={{ borderColor: theme.borderAccent }}
        >
          <Menu className="h-5 w-5" />
        </button>
      ) : null}

      {!isDesktop && isMobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-[1px]"
          aria-label={copy.dashboard.shell.closeNavigation}
          onClick={closeMobileSidebar}
        />
      ) : null}

      <aside
        className={cn(
          "z-40 flex h-[calc(100dvh-7rem)] shrink-0 flex-col overflow-hidden rounded-[2rem] border bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.3)] transition-all duration-300",
          isDesktop
            ? expanded
              ? "sticky top-24 w-[17rem]"
              : "sticky top-24 w-[5.5rem]"
            : cn(
                "fixed left-3 top-24 max-w-[calc(100vw-1.5rem)] sm:left-4 sm:max-w-[calc(100vw-2rem)]",
                isMobileOpen
                  ? "w-[min(17rem,calc(100vw-1.5rem))] translate-x-0 opacity-100 sm:w-[min(17rem,calc(100vw-2rem))]"
                  : "pointer-events-none w-0 -translate-x-4 opacity-0",
              ),
        )}
        style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
      >
        <div className="border-b p-4" style={{ borderColor: theme.borderAccent }}>
          <div className={cn("flex items-center gap-3", !expanded && "justify-center")}>
            <div
              className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
              style={{ background: theme.brandGradient, color: theme.onPrimaryColor }}
            >
              {theme.logoUrl ? (
                <Image
                  src={theme.logoUrl}
                  alt={copy.header.logoAlt(theme.tenantName)}
                  fill
                  sizes="44px"
                  unoptimized
                  className="object-contain p-2"
                />
              ) : (
                <Shield className="h-5 w-5" />
              )}
            </div>
            {expanded ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {theme.tenantName}
                </p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {copy.dashboard.shell.organizationDashboard}
                </p>
              </div>
            ) : null}
            {!isDesktop && expanded ? (
              <button
                type="button"
                onClick={closeMobileSidebar}
                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label={copy.dashboard.shell.closeNavigation}
                style={{ color: theme.linkColor }}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {renderNavSection(
              pathname,
              expanded,
              closeMobileSidebar,
              theme,
              dashboardNavigation,
              copy.dashboard.navigation,
            )}
          </div>

          <div className="mt-5 border-t pt-4" style={{ borderColor: theme.borderAccent }}>
            {expanded ? (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {copy.dashboard.shell.access}
              </p>
            ) : null}
            <div className="space-y-1">
              {renderNavSection(
                pathname,
                expanded,
                closeMobileSidebar,
                theme,
                tenantAccessNavigation,
                copy.dashboard.navigation,
              )}
            </div>
          </div>
        </nav>

        <div className="border-t p-3" style={{ borderColor: theme.borderAccent }}>
          {expanded ? (
            <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {copy.dashboard.shell.signedIn}
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-slate-900">{user.username}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          ) : null}
          {expanded ? (
            <TenantLogoutButton
              className="mb-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            />
          ) : null}
          <button
            type="button"
            onClick={() => (isDesktop ? setIsCollapsed((current) => !current) : closeMobileSidebar())}
            className="tenant-button-soft inline-flex h-10 w-full items-center justify-center rounded-2xl border text-sm font-medium transition"
            style={{ borderColor: theme.borderAccent }}
          >
            {isDesktop
              ? expanded
                ? copy.dashboard.shell.collapse
                : copy.dashboard.shell.expand
              : copy.dashboard.shell.close}
          </button>
        </div>
      </aside>
    </>
  );
}
