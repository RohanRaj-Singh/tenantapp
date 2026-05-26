"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import LanguageTogglePill from "@/components/layout/LanguageTogglePill";
import { RuntimeConfigProvider } from "@/runtime/providers/RuntimeConfigProvider";
import { LanguageProvider } from "@/runtime/language/LanguageContext";
import Header from "@/components/layout/Header";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const protectedSurfacePrefixes = [
    "/dashboard",
    "/analytics",
    "/reports",
    "/settings",
    "/change-password",
  ];
  const isProtectedSurface =
    pathname != null &&
    protectedSurfacePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return (
    <Suspense fallback={null}>
      <RuntimeConfigProvider>
        <LanguageProvider>
          {!isProtectedSurface && <Header />}
          {!isProtectedSurface && <LanguageTogglePill />}
          <div className="min-h-screen">{children}</div>
        </LanguageProvider>
      </RuntimeConfigProvider>
    </Suspense>
  );
}
