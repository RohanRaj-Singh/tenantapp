"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Ban,
  FileText,
  Eye,
  Loader2,
} from "lucide-react";

interface Employee {
  employeeId: string;
  employeeCode: string;
  email: string;
  status: "not_registered" | "active" | "inactive" | "suspended";
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Claim {
  reimbursementId: string;
  claimNumber?: string;
  amount: number;
  description: string;
  clinicName?: string;
  status: string;
  createdAt: string;
}

interface EmployeeDetailPageProps {
  employeeId: string;
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

function formatCurrency(amount: number) {
  return `OMR ${amount.toFixed(3)}`;
}

const STATUS_CONFIG: Record<Employee["status"], { label: string; color: string }> = {
  not_registered: { label: "Not Registered", color: "bg-slate-100 text-slate-500" },
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
  inactive: { label: "Inactive", color: "bg-amber-100 text-amber-700" },
  suspended: { label: "Suspended", color: "bg-red-100 text-red-700" },
};

const CLAIM_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  frozen: { label: "Frozen", color: "bg-sky-100 text-sky-700" },
  paid: { label: "Paid", color: "bg-purple-100 text-purple-700" },
};

export default function EmployeeDetailPage({
  employeeId,
}: EmployeeDetailPageProps) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimsTotal, setClaimsTotal] = useState(0);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchEmployee = useCallback(async () => {
    setError(null);

    try {
      const res = await fetch(`/api/employees/${employeeId}`);
      if (!res.ok) {
        throw new Error("Employee not found.");
      }

      const data = await res.json();
      setEmployee(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setPageLoading(false);
    }
  }, [employeeId]);

  const fetchClaims = useCallback(async () => {
    setClaimsLoading(true);

    try {
      const res = await fetch(
        `/api/reimbursements?employeeId=${employeeId}&limit=5`,
      );
      if (res.ok) {
        const data = await res.json();
        setClaims(data.reimbursements ?? []);
        setClaimsTotal(data.total ?? 0);
      }
    } catch {
      // Non-critical — claims section will show empty state
    } finally {
      setClaimsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchEmployee();
    fetchClaims();
  }, [fetchEmployee, fetchClaims]);

  async function handleSuspend() {
    setActionLoading("suspend");
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "inactive" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to suspend employee.");
      }

      setActionSuccess("Employee suspended.");
      setEmployee(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnsuspend() {
    setActionLoading("unsuspend");
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to unsuspend employee.");
      }

      setActionSuccess("Employee unsuspended.");
      setEmployee(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  // Loading state
  if (pageLoading) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500">Loading employee...</p>
      </div>
    );
  }

  // Error state (fetch failure)
  if (error && !employee) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/employees")}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          &larr; Back to employees
        </button>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  const statusCfg = STATUS_CONFIG[employee.status] ?? STATUS_CONFIG.not_registered;
  const canSuspend = employee.status === "active" || employee.status === "not_registered";
  const canUnsuspend = employee.status === "inactive";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push("/employees")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to employees
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
            Employee Detail
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {employee.employeeCode}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.color}`}
          >
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Action error */}
      {error && employee && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Action success */}
      {actionSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-800">
                {actionSuccess}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detail Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Employee Information */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Employee Information
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-400">
                Employee Code
              </p>
              <p className="mt-0.5 font-mono text-sm font-medium text-slate-900">
                {employee.employeeCode}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Email</p>
              <p className="mt-0.5 text-sm text-slate-700">
                {employee.email}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Status</p>
              <p className="mt-0.5">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.color}`}
                >
                  {statusCfg.label}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Created</p>
              <p className="mt-0.5 text-sm text-slate-700">
                {formatDate(employee.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Updated</p>
              <p className="mt-0.5 text-sm text-slate-700">
                {formatDate(employee.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Employee Actions */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Employee Actions
          </h3>
          <p className="text-sm text-slate-500">
            Manage this employee&apos;s access.
          </p>
          <div className="flex flex-wrap gap-3">
            {canSuspend && (
              <button
                type="button"
                onClick={handleSuspend}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "suspend" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Suspend
              </button>
            )}

            {canUnsuspend && (
              <button
                type="button"
                onClick={handleUnsuspend}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "unsuspend" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Unsuspend
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Claims Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Claims
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Recent claims submitted by this employee.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/reimbursements?employeeId=${employee.employeeId}`)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" />
            View All
          </button>
        </div>

        {claimsLoading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            <span className="text-sm text-slate-400">Loading claims...</span>
          </div>
        ) : claims.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileText className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">
              No claims found for this employee.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Claim #
                  </th>
                  <th className="hidden px-4 py-3 font-semibold text-slate-600 sm:table-cell">
                    Clinic
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Amount
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 font-semibold text-slate-600 md:table-cell">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => {
                  const sCfg = CLAIM_STATUS[claim.status] ?? {
                    label: claim.status,
                    color: "bg-slate-100 text-slate-600",
                  };
                  return (
                    <tr
                      key={claim.reimbursementId}
                      onClick={() =>
                        router.push(`/reimbursements/${claim.reimbursementId}`)
                      }
                      className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {claim.claimNumber ?? claim.reimbursementId.slice(0, 8)}
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                        {claim.clinicName ?? (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {formatCurrency(claim.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sCfg.color}`}
                        >
                          {sCfg.label}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-slate-500 md:table-cell">
                        {formatDate(claim.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {claimsTotal > 5 && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/reimbursements?employeeId=${employee.employeeId}`,
                )
              }
              className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
            >
              View all {claimsTotal} claims &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
