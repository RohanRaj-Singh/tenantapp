"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { RuntimeConfigProvider } from "@/runtime/providers/RuntimeConfigProvider";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <Suspense fallback={null}>
      <RuntimeConfigProvider>
        <div className="min-h-screen">{children}</div>
      </RuntimeConfigProvider>
    </Suspense>
  );
}
