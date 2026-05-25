"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/runtime/language/LanguageContext";
import { useTheme } from "@/runtime/theme/useTheme";

interface StatCardProps {
  title: string;
  value: string;
  caption: string;
  icon?: ReactNode;
  badge?: string;
  accentColor?: string;
}

export function StatCard({ title, value, caption, icon, badge, accentColor }: StatCardProps) {
  const theme = useTheme();
  const iconColor = accentColor ?? theme.linkColor;

  return (
    <Card
      className="rounded-[1.5rem] border bg-white p-5 shadow-sm"
      style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        {icon ? (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{ backgroundColor: theme.surfaceAccentStrong, color: iconColor }}
          >
            {icon}
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm leading-6 text-slate-500">{caption}</p>
        {badge ? (
          <span
            className="rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: theme.surfaceAccentStrong, color: theme.linkColor }}
          >
            {badge}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, description, children, className }: SectionCardProps) {
  const theme = useTheme();

  return (
    <Card
      className={cn("rounded-[1.5rem] border bg-white p-5 shadow-sm", className)}
      style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
    >
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

interface MeterItem {
  label: string;
  value: number;
  caption: string;
}

export function MeterList({ items, accentColor }: { items: MeterItem[]; accentColor?: string }) {
  const theme = useTheme();
  const resolvedAccentColor = accentColor ?? theme.primaryColor;

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-800">{item.label}</p>
              <p className="text-xs text-slate-500">{item.caption}</p>
            </div>
            <p className="text-sm font-semibold text-slate-900">{item.value.toFixed(1)}%</p>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${Math.max(8, Math.min(item.value, 100))}%`,
                backgroundColor: resolvedAccentColor,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface DetailItem {
  title: string;
  description: string;
  toneClassName?: string;
  toneColor?: string;
}

export function DetailListCard({
  title,
  items,
}: {
  title: string;
  items: DetailItem[];
}) {
  const theme = useTheme();

  return (
    <SectionCard title={title}>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.title} className="flex items-start gap-3">
            <span
              className={cn("mt-1 h-2.5 w-2.5 rounded-full", item.toneClassName)}
              style={{ backgroundColor: item.toneColor ?? theme.primaryColor }}
            />
            <div>
              <p className="text-sm font-medium text-slate-800">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function StatusLegendCard() {
  const theme = useTheme();
  const { copy } = useLanguage();
  const sharedCopy = copy.dashboard.shared;
  const bands = [
    {
      label: sharedCopy.statusLabels.thriving,
      range: sharedCopy.statusRanges.thriving,
      tone: theme.chartColors.success,
    },
    {
      label: sharedCopy.statusLabels.stable,
      range: sharedCopy.statusRanges.stable,
      tone: theme.chartColors.info,
    },
    {
      label: sharedCopy.statusLabels.watchlist,
      range: sharedCopy.statusRanges.watchlist,
      tone: theme.chartColors.warning,
    },
    {
      label: sharedCopy.statusLabels.atRisk,
      range: sharedCopy.statusRanges.atRisk,
      tone: theme.chartColors.danger,
    },
  ];

  return (
    <SectionCard
      title={sharedCopy.statusLegendTitle}
      description={sharedCopy.statusLegendDescription}
    >
      <div className="space-y-3">
        {bands.map((band) => (
          <div
            key={band.label}
            className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3"
            style={{ backgroundColor: theme.surfaceAccent }}
          >
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: band.tone }} />
              <p className="text-sm font-medium text-slate-800">{band.label}</p>
            </div>
            <p className="text-xs font-medium text-slate-500">{band.range}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
