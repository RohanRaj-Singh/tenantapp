"use client";

import type { ReactNode } from "react";
import { useContext } from "react";
import Header from "@/components/layout/Header";
import RuntimeUnavailableState from "@/components/runtime/RuntimeUnavailableState";
import { RuntimeContext } from "@/runtime/context/RuntimeContext";
import { useTheme } from "@/runtime/theme/useTheme";

export default function RuntimeAppShell({
  children,
}: {
  children: ReactNode;
}) {
  const { config, error, loading, tenantSlug, tenantSource } =
    useContext(RuntimeContext);
  const theme = useTheme();

  return (
    <>
      <Header />
      {loading && !config ? (
        <div className="tenant-page-shell flex min-h-screen w-full items-center justify-center px-4 pt-24">
          <div
            className="rounded-[28px] border bg-white px-8 py-10 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]"
            style={{
              borderColor: theme.borderAccent,
              background: theme.cardGradient,
            }}
          >
            <p className="text-sm font-medium text-slate-500">
              Loading tenant runtime...
            </p>
          </div>
        </div>
      ) : !config ? (
        <RuntimeUnavailableState
          error={error}
          tenantSlug={tenantSlug}
          tenantSource={tenantSource}
        />
      ) : (
        children
      )}
    </>
  );
}
