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
} from "lucide-react";

interface Reimbursement {
  reimbursementId: string;
  employeeId: string;
  employeeName: string;
  type: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  status: "pending" | "approved" | "rejected" | "frozen";
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
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
};

interface ReimbursementDetailPageProps {
  reimbursementId: string;
}

export default function ReimbursementDetailPage({
  reimbursementId,
}: ReimbursementDetailPageProps) {
  const router = useRouter();
  const [reimbursement, setReimbursement] =
    useState<Reimbursement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  async function handleAction(action: string) {
    setActionLoading(action);
    setError(null);

    try {
      const res = await fetch(
        `/api/reimbursements/${reimbursementId}/${action}`,
        { method: "POST" },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action} claim.`);
      }

      const data = await res.json();
      setReimbursement(data);
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
  const isPending = reimbursement.status === "pending";

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
            <div>
              <p className="text-xs font-medium text-slate-400">Type</p>
              <p className="mt-0.5 text-sm font-medium capitalize text-slate-900">
                {reimbursement.type}
              </p>
            </div>
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
                <a
                  href={reimbursement.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  View Receipt &rarr;
                </a>
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

        {/* Review Info (if reviewed) */}
        {reimbursement.reviewedBy && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Review
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Reviewed At
                </p>
                <p className="mt-0.5 text-sm text-slate-700">
                  {reimbursement.reviewedAt
                    ? formatDate(reimbursement.reviewedAt)
                    : "—"}
                </p>
              </div>
              {reimbursement.notes && (
                <div>
                  <p className="text-xs font-medium text-slate-400">Notes</p>
                  <p className="mt-0.5 text-sm text-slate-700">
                    {reimbursement.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions (only for pending claims) */}
      {isPending && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Review Claim
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Take action on this pending claim.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
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
              Approve
            </button>
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
              Reject
            </button>
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
          </div>
        </div>
      )}
    </div>
  );
}
