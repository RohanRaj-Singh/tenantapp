"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { RuntimeConfigProvider } from "@/runtime/providers/RuntimeConfigProvider";
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
        {!isDashboardPage && <Header />}
        <div className="min-h-screen">{children}</div>
      </RuntimeConfigProvider>
    </Suspense>
  );
}
