"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Snowflake,
  Eye,
  EyeOff,
} from "lucide-react";

interface ClaimHistoryEntry {
  status: "pending" | "approved" | "rejected" | "frozen" | "paid";
  actorId: string;
  actorRole: "employee" | "tenantAdmin";
  note?: string;
  timestamp: string;
}

interface Reimbursement {
  reimbursementId: string;
  claimNumber?: string;
  employeeId: string;
  employeeName: string;
  type: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  receiptHash?: string;
  serviceDate?: string;
  clinicId?: string;
  clinicName?: string;
  status: "pending" | "approved" | "rejected" | "frozen" | "paid";
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  history?: ClaimHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  pending: {
    label: "Pending",
    color: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  approved: {
    label: "Approved",
    color: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
  frozen: {
    label: "Frozen",
    color: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  paid: {
    label: "Paid",
    color: "bg-purple-100 text-purple-700",
    dot: "bg-purple-500",
  },
};

interface ReimbursementDetailPageProps {
  reimbursementId: string;
}

type ActionType = "approve" | "reject" | "freeze" | "pay";

const ACTION_LABELS: Record<ActionType, string> = {
  approve: "Approve",
  reject: "Reject",
  freeze: "Freeze",
  pay: "Mark as Paid",
};

export default function ReimbursementDetailPage({
  reimbursementId,
}: ReimbursementDetailPageProps) {
  const router = useRouter();
  const [reimbursement, setReimbursement] =
    useState<Reimbursement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<ActionType | null>(null);
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const fetchReimbursement = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/reimbursements/${reimbursementId}`);
      if (!res.ok) {
        throw new Error("Claim not found.");
      }

      const data = await res.json();
      setReimbursement(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }, [reimbursementId]);

  useEffect(() => {
    fetchReimbursement();
  }, [fetchReimbursement]);

  async function handleAction(action: ActionType) {
    // Require notes for reject
    const trimmedNotes = notes.trim();
    if (action === "reject" && !trimmedNotes) {
      setNotesError("A reason is required when rejecting a claim.");
      return;
    }
    setNotesError(null);
    setActionLoading(action);
    setError(null);

    try {
      const res = await fetch(
        `/api/reimbursements/${reimbursementId}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: trimmedNotes || undefined }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action} claim.`);
      }

      const data = await res.json();
      setReimbursement(data);
      setNotes("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500">Loading claim...</p>
      </div>
    );
  }

  // Error state (fetch failure)
  if (error && !reimbursement) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/reimbursements")}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          &larr; Back to claims
        </button>
      </div>
    );
  }

  if (!reimbursement) {
    return null;
  }

  const statusCfg = STATUS_CONFIG[reimbursement.status] ?? STATUS_CONFIG.pending;
  const canAct = reimbursement.status === "pending" || reimbursement.status === "frozen" || reimbursement.status === "approved";
  const availableActions: ActionType[] =
    reimbursement.status === "frozen"
      ? ["approve", "reject"]
      : reimbursement.status === "approved"
        ? ["pay"]
        : ["approve", "reject", "freeze"];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push("/reimbursements")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to claims
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
            Claim Detail
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {reimbursement.employeeName}
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium capitalize ${statusCfg.color}`}
        >
          <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
          {statusCfg.label}
        </span>
      </div>

      {/* Action error */}
      {error && reimbursement && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Detail Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Claim Info */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Claim Information
          </h3>
          <div className="space-y-3">
            {reimbursement.claimNumber && (
              <div>
                <p className="text-xs font-medium text-slate-400">Reference Number</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                  {reimbursement.claimNumber}
                </p>
              </div>
            )}
            {reimbursement.clinicName && (
              <div>
                <p className="text-xs font-medium text-slate-400">Clinic</p>
                <p className="mt-0.5 text-sm font-medium text-slate-900">
                  {reimbursement.clinicName}
                </p>
              </div>
            )}
            {reimbursement.serviceDate && (
              <div>
                <p className="text-xs font-medium text-slate-400">Service Date</p>
                <p className="mt-0.5 text-sm text-slate-700">{reimbursement.serviceDate}</p>
              </div>
            )}
            {reimbursement.receiptHash && (
              <div>
                <p className="text-xs font-medium text-slate-400">Receipt Hash</p>
                <p className="mt-0.5 font-mono text-xs text-slate-500 break-all">
                  {reimbursement.receiptHash.slice(0, 16)}&hellip;
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-slate-400">Amount</p>
              <p className="mt-0.5 text-2xl font-bold text-slate-900">
                {formatCurrency(reimbursement.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Description</p>
              <p className="mt-0.5 text-sm text-slate-700">
                {reimbursement.description}
              </p>
            </div>
            {reimbursement.receiptUrl && (
              <div>
                <p className="text-xs font-medium text-slate-400">Receipt</p>
                <button
                  type="button"
                  onClick={() => setShowReceipt(!showReceipt)}
                  className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  {showReceipt ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showReceipt ? "Hide Receipt" : "View Receipt"}
                </button>
                {showReceipt && (
                  <div className="mt-3 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                    {reimbursement.receiptUrl?.toLowerCase().endsWith('.pdf') ? (
                      <iframe
                        src={`/api/reimbursements/${reimbursement.reimbursementId}/receipt`}
                        className="w-full h-[500px] border-0"
                        title="Receipt preview"
                      />
                    ) : (
                      <img
                        src={`/api/reimbursements/${reimbursement.reimbursementId}/receipt`}
                        alt="Receipt"
                        className="w-full h-auto max-h-[500px] object-contain"
                      />
                    )}
                    <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-slate-200">
                      <span className="text-xs text-slate-400">Secure preview</span>
                      <a
                        href={`/api/reimbursements/${reimbursement.reimbursementId}/receipt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Open in new tab
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Employee Info */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Employee
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-400">Name</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">
                {reimbursement.employeeName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Submitted</p>
              <p className="mt-0.5 text-sm text-slate-700">
                {formatDate(reimbursement.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">
                Last Updated
              </p>
              <p className="mt-0.5 text-sm text-slate-700">
                {formatDate(reimbursement.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Claim History — single source of truth for all review activity */}
      {reimbursement.history && reimbursement.history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">
            Claim History
          </h3>
          <ol className="relative border-l border-slate-200 ml-2 space-y-4">
            {reimbursement.history.map((entry, i) => {
              const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.pending;
              return (
                <li key={i} className="pl-5 relative">
                  <span className={`absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white ${cfg.dot}`} />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {entry.actorRole === "employee" ? "Employee" : `Reviewer (${entry.actorId})`}
                    </span>
                    <span className="text-xs text-slate-400">&middot; {formatDate(entry.timestamp)}</span>
                  </div>
                  {entry.note && (
                    <p className="mt-1 text-xs text-slate-600">{entry.note}</p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Action Form — shown for claims that can still be acted on */}
      {canAct && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            {reimbursement.status === "frozen" ? "Resolve Frozen Claim" : reimbursement.status === "approved" ? "Complete Payment" : "Review Claim"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {reimbursement.status === "frozen"
              ? "This claim is frozen. You can approve or reject it."
              : reimbursement.status === "approved"
                ? "This claim is approved. Mark it as paid to complete the lifecycle."
                : "Review this pending claim and take action."}
          </p>

          {/* Notes field */}
          <div className="mt-4">
            <label
              htmlFor="action-notes"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Notes
              <span className="text-red-500 ml-0.5">*</span>
              <span className="text-xs font-normal text-slate-400 ml-2">
                (required for rejection)
              </span>
            </label>
            <textarea
              id="action-notes"
              rows={3}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (notesError) setNotesError(null);
              }}
              disabled={actionLoading !== null}
              placeholder="Add a note explaining this decision..."
              className={`w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-900 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                notesError
                  ? "border-red-300 focus:ring-red-300"
                  : "border-slate-200 focus:ring-teal-300"
              }`}
            />
            {notesError && (
              <p className="mt-1 text-xs text-red-600">{notesError}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap gap-3">
            {availableActions.includes("approve") && (
              <button
                type="button"
                onClick={() => handleAction("approve")}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "approve" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {reimbursement.status === "frozen" ? "Approve (Thaw)" : "Approve"}
              </button>
            )}
            {availableActions.includes("reject") && (
              <button
                type="button"
                onClick={() => handleAction("reject")}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "reject" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {reimbursement.status === "frozen" ? "Reject (Thaw)" : "Reject"}
              </button>
            )}
            {availableActions.includes("freeze") && (
              <button
                type="button"
                onClick={() => handleAction("freeze")}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "freeze" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Snowflake className="h-4 w-4" />
                )}
                Freeze
              </button>
            )}
            {availableActions.includes("pay") && (
              <button
                type="button"
                onClick={() => handleAction("pay")}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "pay" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
