"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Lock, Mail, Send, ShieldCheck, Upload, Users } from "lucide-react";
import { SectionCard, StatCard } from "@/components/dashboard/DashboardPrimitives";
import { getDashboardMockData } from "@/lib/dashboardMockData";
import { useTheme } from "@/runtime/theme/useTheme";

type InvitationTab = "upload" | "send" | "monitor";

export default function EmailInvitationsPage() {
  const theme = useTheme();
  const tenantName = theme.tenantName;
  const data = useMemo(() => getDashboardMockData(tenantName), [tenantName]);
  const [tab, setTab] = useState<InvitationTab>("upload");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);

  if (!isUnlocked) {
    return (
      <div className="mx-auto max-w-md">
        <SectionCard
          title="Email Invitations Access Login"
          description="This route keeps the same gated access concept as the source organization dashboard."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Username</label>
              <input
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                className="tenant-field w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
                style={{ borderColor: theme.borderAccent }}
                placeholder="Enter organization username"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="tenant-field w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
                style={{ borderColor: theme.borderAccent }}
                placeholder="Enter access password"
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
              Unlock Email Invitations
            </button>
          </div>
        </SectionCard>
      </div>
    );
  }

  const tabs: { id: InvitationTab; label: string; icon: typeof Upload }[] = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "send", label: "Send", icon: Send },
    { id: "monitor", label: "Monitor", icon: Mail },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Uploaded Employees"
          value={String(data.invitationOverview.uploadedEmployees)}
          caption="People currently staged for invitation workflows."
          icon={<Users className="h-4 w-4" />}
          accentColor={theme.chartColors.info}
        />
        <StatCard
          title="Queued Invitations"
          value={String(data.invitationOverview.invitationsQueued)}
          caption="Invite records prepared for sending."
          icon={<Upload className="h-4 w-4" />}
          accentColor={theme.chartColors.secondary}
        />
        <StatCard
          title="Sent"
          value={String(data.invitationOverview.invitationsSent)}
          caption="Invitations already pushed to recipients."
          icon={<Send className="h-4 w-4" />}
          accentColor={theme.chartColors.primary}
        />
        <StatCard
          title="Completed Responses"
          value={String(data.invitationOverview.completedResponses)}
          caption="Completed survey responses attributed to email campaigns."
          icon={<CheckCircle2 className="h-4 w-4" />}
          accentColor={theme.chartColors.success}
        />
      </div>

      <SectionCard
        title="Section Access Control Enabled"
        description="Use the same upload, send, and monitor options as the source dashboard, with a lighter interface."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-2xl px-4 py-3 text-sm text-slate-500" style={{ backgroundColor: theme.surfaceAccent }}>
            {data.invitationOverview.securedUsers} secured users - last password rotation{" "}
            {data.invitationOverview.lastPasswordRotation}
          </div>
          <button
            type="button"
            onClick={() => setIsUnlocked(false)}
            className="tenant-button-soft inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition"
            style={{ borderColor: theme.borderAccent }}
          >
            <Lock className="h-4 w-4" />
            Lock Section
          </button>
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
        <SectionCard title="Upload Employee List" description="Prepare the audience before invitations are dispatched.">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Validate spreadsheet columns",
              "Review duplicate or inactive records",
              "Assign campaign labels before send",
            ].map((step) => (
              <div key={step} className="rounded-[1.25rem] p-4 text-sm text-slate-600" style={{ backgroundColor: theme.surfaceAccentStrong }}>
                {step}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {tab === "send" ? (
        <SectionCard title="Send Survey Invitations" description="Manage active and scheduled email campaigns.">
          <div className="space-y-3">
            {data.invitationCampaigns.map((campaign) => (
              <div
                key={campaign.name}
                className="rounded-[1.25rem] border px-4 py-4"
                style={{ borderColor: theme.borderAccent, backgroundColor: theme.surfaceAccentStrong }}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{campaign.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {campaign.recipients} recipients - scheduled for {campaign.scheduledFor}
                    </p>
                  </div>
                  <span className="tenant-outline-chip rounded-full px-3 py-1 text-xs font-medium shadow-sm">
                    {campaign.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {tab === "monitor" ? (
        <SectionCard title="Monitor Completion Status" description="Track engagement after invitations are delivered.">
          <div className="space-y-4">
            {data.invitationCampaigns.map((campaign) => (
              <div key={campaign.name} className="space-y-2 rounded-[1.25rem] p-4" style={{ backgroundColor: theme.surfaceAccentStrong }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-900">{campaign.name}</p>
                  <p className="text-xs font-medium text-slate-500">{campaign.completed} completed</p>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min((campaign.completed / campaign.recipients) * 100, 100)}%`,
                      backgroundColor: theme.primaryColor,
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {campaign.opened} opened out of {campaign.recipients} recipients.
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
