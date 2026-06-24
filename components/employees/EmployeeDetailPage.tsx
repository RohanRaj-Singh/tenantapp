"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  KeyRound,
  Unlock,
  Clock,
  Ban,
} from "lucide-react";

interface Employee {
  employeeId: string;
  employeeCode: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeDetailPageProps {
  employeeId: string;
}

function isLocked(lockedUntil: string | null): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil) > new Date();
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

export default function EmployeeDetailPage({
  employeeId,
}: EmployeeDetailPageProps) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newPin, setNewPin] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchEmployee = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  async function handleResetPin() {
    setActionLoading("reset-pin");
    setError(null);
    setNewPin(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/employees/${employeeId}/reset-pin`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset PIN.");
      }

      setNewPin(data.newPin);
      setActionSuccess("PIN reset successfully.");
      setEmployee(data.employee);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnlock() {
    setActionLoading("unlock");
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/employees/${employeeId}/unlock`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to unlock employee.");
      }

      setActionSuccess("Employee unlocked successfully.");
      setEmployee(data.employee);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  // Loading state
  if (loading) {
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

  const employeeLocked = isLocked(employee.lockedUntil);

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
            {employee.name}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              employee.status === "active"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {employee.status}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              employeeLocked
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {employeeLocked ? "Locked" : "Active"}
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
              {newPin && (
                <p className="mt-2 text-sm text-emerald-700">
                  New PIN:{" "}
                  <span className="font-mono text-lg font-bold tracking-widest text-emerald-900">
                    {newPin}
                  </span>
                </p>
              )}
              {newPin && (
                <p className="mt-1 text-xs text-emerald-600">
                  Share this PIN securely with the employee. It will not be shown again.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* General Information */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            General Information
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
              <p className="text-xs font-medium text-slate-400">Name</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">
                {employee.name}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Email</p>
              <p className="mt-0.5 text-sm text-slate-700">
                {employee.email}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Created</p>
              <p className="mt-0.5 text-sm text-slate-700">
                {formatDate(employee.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Access Information */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Access Information
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
              <p className="text-xs font-medium text-slate-400">Status</p>
              <p className="mt-0.5">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    employee.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {employee.status}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">
                Last Access
              </p>
              <p className="mt-0.5 text-sm text-slate-700">
                {employee.lastAccessAt
                  ? formatDate(employee.lastAccessAt)
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">
                Failed Login Attempts
              </p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">
                {employee.failedLoginAttempts}
                {employee.failedLoginAttempts > 0 && (
                  <span className="ml-1 text-xs text-amber-600">
                    / 5
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">
                Lock State
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                {employeeLocked ? (
                  <>
                    <Ban className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">
                      Locked until {formatDate(employee.lockedUntil!)}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-emerald-700">Active</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Access Management
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Manage this employee&apos;s portal access.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleResetPin}
            disabled={actionLoading !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "reset-pin" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Reset PIN
          </button>

          {employeeLocked && (
            <button
              type="button"
              onClick={handleUnlock}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "unlock" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Unlock className="h-4 w-4" />
              )}
              Unlock Employee
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
