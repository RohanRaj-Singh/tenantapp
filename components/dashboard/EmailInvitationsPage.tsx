"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Lock, Mail, Send, ShieldCheck, Upload, Users } from "lucide-react";
import { SectionCard, StatCard } from "@/components/dashboard/DashboardPrimitives";
import { useLanguage } from "@/runtime/language/LanguageContext";
import { useTheme } from "@/runtime/theme/useTheme";

type InvitationTab = "upload" | "send" | "monitor";

export default function EmailInvitationsPage() {
  const theme = useTheme();
  const tenantName = theme.tenantName;
  const { copy } = useLanguage();
  const emailCopy = copy.dashboard.emailInvitations;
  const sharedCopy = copy.dashboard.shared;
  const [tab, setTab] = useState<InvitationTab>("upload");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);

  if (!isUnlocked) {
    return (
      <div className="mx-auto max-w-md">
        <SectionCard
          title={emailCopy.loginTitle}
          description={emailCopy.loginDescription}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {emailCopy.username}
              </label>
              <input
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                className="tenant-field w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
                style={{ borderColor: theme.borderAccent }}
                placeholder={emailCopy.usernamePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {emailCopy.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="tenant-field w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
                style={{ borderColor: theme.borderAccent }}
                placeholder={emailCopy.passwordPlaceholder}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (userName && password) {
                  setIsUnlocked(true);
                }
              }}
              className="tenant-button inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition"
            >
              <ShieldCheck className="h-4 w-4" />
              {emailCopy.unlock}
            </button>
          </div>
        </SectionCard>
      </div>
    );
  }

  const tabs: { id: InvitationTab; label: string; icon: typeof Upload }[] = [
    { id: "upload", label: emailCopy.uploadTab, icon: Upload },
    { id: "send", label: emailCopy.sendTab, icon: Send },
    { id: "monitor", label: emailCopy.monitorTab, icon: Mail },
  ];

  return (
    <div className="space-y-6">
      <SectionCard
        title={emailCopy.title}
        description={sharedCopy.unavailableSoon}
      >
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Users className="h-10 w-10 text-slate-400" />
          <p className="text-sm text-slate-500">
            {emailCopy.description(tenantName)}
          </p>
          <span className="tenant-outline-chip rounded-full px-3 py-1 text-xs font-medium shadow-sm">
            {sharedCopy.futureFeature}
          </span>
        </div>
      </SectionCard>

      <div className="inline-flex rounded-2xl border bg-white p-1 shadow-sm" style={{ borderColor: theme.borderAccent }}>
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className="inline-flex items-center gap-2 rounded-[0.9rem] px-4 py-2.5 text-sm font-medium transition"
              style={active
                ? {
                    backgroundColor: theme.primaryColor,
                    color: theme.onPrimaryColor,
                    boxShadow: `0 18px 36px -26px ${theme.strongAccent}`,
                  }
                : { color: "#64748b" }}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "upload" ? (
        <SectionCard title={emailCopy.uploadTitle} description={emailCopy.uploadDescription}>
          <p className="text-sm text-slate-500">
            {emailCopy.uploadBody}
          </p>
        </SectionCard>
      ) : null}

      {tab === "send" ? (
        <SectionCard title={emailCopy.sendTitle} description={emailCopy.sendDescription}>
          <p className="text-sm text-slate-500">
            {emailCopy.sendBody}
          </p>
        </SectionCard>
      ) : null}

      {tab === "monitor" ? (
        <SectionCard title={sharedCopy.monitorTitle} description={emailCopy.monitorDescription}>
          <p className="text-sm text-slate-500">
            {emailCopy.monitorBody}
          </p>
        </SectionCard>
      ) : null}
    </div>
  );
}
