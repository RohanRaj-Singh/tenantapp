"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Lock,
  Mail,
  Send,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { SectionCard, StatCard } from "@/components/dashboard/DashboardPrimitives";
import { useLanguage } from "@/runtime/language/LanguageContext";
import { useTheme } from "@/runtime/theme/useTheme";
import { getDashboardMockData } from "@/lib/dashboardMockData";

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
  const invitationData = useMemo(() => getDashboardMockData(tenantName), [tenantName]);

  if (!isUnlocked) {
    return (
      <div className="mx-auto max-w-md">
        <SectionCard title={emailCopy.loginTitle} description={emailCopy.loginDescription}>
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

  const overview = invitationData.invitationOverview;
  const campaigns = invitationData.invitationCampaigns ?? [];

  const tabs: { id: InvitationTab; label: string; icon: typeof Upload }[] = [
    { id: "upload", label: emailCopy.uploadTab, icon: Upload },
    { id: "send", label: emailCopy.sendTab, icon: Send },
    { id: "monitor", label: emailCopy.monitorTab, icon: Mail },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Employees Uploaded"
          value={String(overview?.uploadedEmployees ?? 0)}
          caption="Employees available for invitation targeting."
          icon={<Users className="h-4 w-4" />}
          accentColor={theme.chartColors.info}
        />
        <StatCard
          title="Invitations Sent"
          value={String(overview?.invitationsSent ?? 0)}
          caption="Total invitation emails already delivered."
          icon={<Mail className="h-4 w-4" />}
          accentColor={theme.chartColors.primary}
        />
        <StatCard
          title="Completed Responses"
          value={String(overview?.completedResponses ?? 0)}
          caption="Recipients who have already completed the survey."
          icon={<CheckCircle2 className="h-4 w-4" />}
          accentColor={theme.chartColors.success}
        />
        <StatCard
          title="Secured Users"
          value={String(overview?.securedUsers ?? 0)}
          caption={`Last password rotation: ${overview?.lastPasswordRotation ?? "N/A"}.`}
          icon={<Lock className="h-4 w-4" />}
          accentColor={theme.chartColors.warning}
        />
      </section>

      <SectionCard title={emailCopy.title} description={emailCopy.description(tenantName)}>
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition"
                style={
                  active
                    ? {
                        backgroundColor: "#ffffff",
                        color: theme.primaryColor,
                        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.1)",
                      }
                    : { color: "#64748b" }
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {tab === "upload" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <SectionCard title={emailCopy.uploadTitle} description={emailCopy.uploadDescription}>
            <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <Upload className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-4 text-sm text-slate-600">{emailCopy.uploadBody}</p>
            </div>
          </SectionCard>
          <SectionCard title="Recent Campaigns" description="Latest invitation waves for this tenant workspace.">
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <div key={campaign.name} className="rounded-[1.25rem] border bg-white p-4" style={{ borderColor: theme.borderAccent }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{campaign.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{campaign.scheduledFor}</p>
                    </div>
                    <span className="tenant-outline-chip rounded-full px-3 py-1 text-xs font-medium">
                      {campaign.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === "send" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <SectionCard title={emailCopy.sendTitle} description={emailCopy.sendDescription}>
            <p className="text-sm leading-7 text-slate-500">{emailCopy.sendBody}</p>
          </SectionCard>
          <SectionCard title="Delivery Readiness" description="Snapshot of invitations waiting to be sent or resumed.">
            <div className="space-y-3">
              <div className="rounded-[1.25rem] p-4" style={{ backgroundColor: theme.surfaceAccentStrong }}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Queued</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{overview?.invitationsQueued ?? 0}</p>
              </div>
              <div className="rounded-[1.25rem] p-4" style={{ backgroundColor: theme.surfaceAccentStrong }}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Completed</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{overview?.completedResponses ?? 0}</p>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === "monitor" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <SectionCard title={sharedCopy.monitorTitle} description={emailCopy.monitorDescription}>
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const completionRate =
                  campaign.recipients > 0 ? Math.round((campaign.completed / campaign.recipients) * 100) : 0;

                return (
                  <div key={campaign.name} className="rounded-[1.25rem] border bg-white p-4" style={{ borderColor: theme.borderAccent }}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{campaign.name}</p>
                        <p className="text-xs text-slate-500">{campaign.recipients} recipients</p>
                      </div>
                      <span className="tenant-outline-chip rounded-full px-3 py-1 text-xs font-medium">
                        {campaign.status}
                      </span>
                    </div>
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                      <span>Completion rate</span>
                      <span>{completionRate}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${completionRate}%`, backgroundColor: theme.chartColors.success }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
          <SectionCard title="Status Notes" description={sharedCopy.unavailableSoon}>
            <p className="text-sm leading-7 text-slate-500">{emailCopy.monitorBody}</p>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
