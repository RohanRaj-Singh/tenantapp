"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, Search, FileText } from "lucide-react";
import {
  clinicStatusStyle,
  formatClinicAmount,
  formatClinicDate,
  type ClinicClaim,
} from "../types";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "approved", label: "Approved" },
  { value: "to_be_paid", label: "Awaiting Payout" },
  { value: "rejected", label: "Rejected" },
  { value: "frozen", label: "Frozen" },
  { value: "paid", label: "Paid" },
] as const;

export function ClinicClaimsList() {
  const [claims, setClaims] = useState<ClinicClaim[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(handle);
  }, [search]);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/clinic/reimbursements?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.assign("/clinic/login");
          return;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load claims.");
      }
      const data = await res.json();
      setClaims(data.claims ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claims.");
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                status === filter.value
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search claims…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </div>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading claims…
          </div>
        ) : claims.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <FileText className="h-10 w-10 text-slate-200" />
            <p className="text-sm font-medium text-slate-500">No claims found</p>
            <p className="text-xs text-slate-400">
              Claims you submit for your clinic will appear here.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Employee code</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => {
                const style = clinicStatusStyle(claim.status);
                return (
                  <tr
                    key={claim.reimbursementId}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/clinic/claims/${claim.reimbursementId}`}
                        className="font-medium text-teal-700 hover:underline"
                      >
                        {claim.claimNumber ?? claim.reimbursementId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {claim.employeeCode ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {formatClinicAmount(claim.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.className}`}
                      >
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatClinicDate(claim.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && claims.length > 0 ? (
        <p className="mt-3 text-xs text-slate-400">
          Showing {claims.length} of {total} claim{total === 1 ? "" : "s"}.
        </p>
      ) : null}
    </div>
  );
}
