"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionCard } from "@/components/dashboard/DashboardPrimitives";
import { useTheme } from "@/runtime/theme/useTheme";

export function DashboardLoadingState({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <Card
      className="rounded-[1.5rem] border p-8 shadow-sm"
      style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
    >
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: theme.surfaceAccentStrong, color: theme.primaryColor }}
        >
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
        <div className="space-y-2">
          <p className="text-base font-semibold text-slate-900">Loading dashboard</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </div>
    </Card>
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
