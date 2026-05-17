"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Lock, Mail, Send, ShieldCheck, Upload, Users } from "lucide-react";
import { SectionCard, StatCard } from "@/components/dashboard/DashboardPrimitives";
import { useTheme } from "@/runtime/theme/useTheme";

type InvitationTab = "upload" | "send" | "monitor";

export default function EmailInvitationsPage() {
  const theme = useTheme();
  const tenantName = theme.tenantName;
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
      <SectionCard
        title="Invitation Analytics Coming Soon"
        description="Email invitation tracking is not yet connected to the live analytics backend."
      >
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Users className="h-10 w-10 text-slate-400" />
          <p className="text-sm text-slate-500">
            Invitation send rates, open rates, and campaign completion metrics will appear here
            once the invitation tracking backend is active for <strong>{tenantName}</strong>.
          </p>
          <span className="tenant-outline-chip rounded-full px-3 py-1 text-xs font-medium shadow-sm">
            Future Feature
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
        <SectionCard title="Upload Employee List" description="The upload workflow will be available once the invitation backend is active.">
          <p className="text-sm text-slate-500">
            Connection to the invitation delivery system is pending. All uploaded data is held locally and
            is not yet transmitted. No analytics will appear until the backend endpoint is live.
          </p>
        </SectionCard>
      ) : null}

      {tab === "send" ? (
        <SectionCard title="Send Survey Invitations" description="Campaign management will be available after the invitation backend is activated.">
          <p className="text-sm text-slate-500">
            Campaign create, schedule, and send controls are not yet wired to backend services.
            Any campaign interactions are placeholders only.
          </p>
        </SectionCard>
      ) : null}

      {tab === "monitor" ? (
        <SectionCard title="Monitor Completion Status" description="Real-time completion tracking will appear here after backend activation.">
          <p className="text-sm text-slate-500">
            Completion rates, open rates, and per-campaign progress bars require a live invitation
            tracking backend. No fabricated data is displayed.
          </p>
        </SectionCard>
      ) : null}
    </div>
  );
}
