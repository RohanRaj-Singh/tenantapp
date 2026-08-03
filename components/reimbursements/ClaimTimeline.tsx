"use client";

// ── Claim History timeline ──────────────────────────────────────────────────
// Shared renderer for the claim's append-only history (status changes, reviewer
// notes, progress updates, resubmissions). Used by the tenant-admin claim detail page.

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  to_be_paid: { label: "To Be Paid", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  frozen: { label: "Frozen", color: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  paid: { label: "Paid", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
};

interface ClaimHistoryEntry {
  status: string;
  actorRole: "employee" | "tenantAdmin";
  note?: string;
  timestamp: string;
}

interface ClaimTimelineProps {
  history?: ClaimHistoryEntry[];
  employeeLabel?: string;
  reviewerLabel?: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClaimTimeline({
  history,
  employeeLabel = "Employee",
  reviewerLabel = "Reviewer",
}: ClaimTimelineProps) {
  if (!history || history.length === 0) return null;

  return (
    <ol className="relative border-l border-slate-200 ml-2 space-y-4">
      {history.map((entry, i) => {
        const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.pending;
        return (
          <li key={i} className="pl-5 relative">
            <span className={`absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white ${cfg.dot}`} />
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cfg.color}`}>{cfg.label}</span>
              <span className="text-xs text-slate-400">{entry.actorRole === "employee" ? employeeLabel : reviewerLabel}</span>
              <span className="text-xs text-slate-400">&middot; {formatDate(entry.timestamp)}</span>
            </div>
            {entry.note && <p className="mt-1 text-xs text-slate-600">{entry.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}
