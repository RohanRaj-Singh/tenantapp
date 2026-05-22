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
  const isDashboardPage = pathname?.startsWith("/dashboard") ?? false;

  return (
    <Suspense fallback={null}>
      <RuntimeConfigProvider>
        <LanguageProvider>
          {!isDashboardPage && <Header />}
          {!isDashboardPage && <LanguageTogglePill />}
          <div className="min-h-screen">{children}</div>
        </LanguageProvider>
      </RuntimeConfigProvider>
    </Suspense>
  );
}
