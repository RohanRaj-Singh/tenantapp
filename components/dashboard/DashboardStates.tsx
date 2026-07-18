"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { SectionCard } from "@/components/dashboard/DashboardPrimitives";
import { useTheme } from "@/runtime/theme/useTheme";

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="h-6 w-6 rounded-full bg-slate-200" />
      </div>
      <div className="mb-2 h-8 w-16 rounded bg-slate-200" />
      <div className="h-3 w-28 rounded bg-slate-200" />
    </div>
  );
}

export function DashboardLoadingState({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-sm" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
    </div>
  );
}

export function DashboardErrorState({
  title,
  description,
  buttonLabel,
  onRetry,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onRetry: () => void;
}) {
  const theme = useTheme();

  return (
    <div className="space-y-6">
      <SectionCard title={title} description={description}>
        <div className="flex items-start gap-3 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p className="text-sm leading-6">
            Dashboard data is temporarily unavailable for this tenant session.
          </p>
        </div>
      </SectionCard>
      <SectionCard title="Recovery">
        <button
          type="button"
          onClick={onRetry}
          className="tenant-button inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition"
          style={{ boxShadow: `0 18px 36px -28px ${theme.strongAccent}` }}
        >
          <RefreshCw className="h-4 w-4" />
          {buttonLabel}
        </button>
      </SectionCard>
    </div>
  );
}
