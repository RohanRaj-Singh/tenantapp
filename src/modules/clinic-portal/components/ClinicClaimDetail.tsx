"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Hash,
  Loader2,
  Receipt,
  Stethoscope,
} from "lucide-react";
import ClaimChat from "@/components/reimbursements/ClaimChat";
import ClaimRequests from "@/components/reimbursements/ClaimRequests";
import {
  clinicStatusStyle,
  formatClinicAmount,
  formatClinicDateTime,
  type ClinicClaim,
} from "../types";

export function ClinicClaimDetail({ claimId }: { claimId: string }) {
  const [claim, setClaim] = useState<ClinicClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchClaim = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/clinic/reimbursements/${claimId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.assign("/clinic/login");
          return;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load claim.");
      }
      const data = await res.json();
      setClaim(data.claim ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claim.");
      setClaim(null);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchClaim();
  }, [fetchClaim]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading claim…
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-20 text-center">
        <AlertCircle className="h-10 w-10 text-slate-200" />
        <p className="text-sm font-medium text-slate-600">
          {error || "Claim not found"}
        </p>
        <p className="text-xs text-slate-400">
          This claim may have been removed or is outside your clinic&apos;s scope.
        </p>
        <Link
          href="/clinic/claims"
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to claims
        </Link>
      </div>
    );
  }

  const style = clinicStatusStyle(claim.status);

  return (
    <div>
      <Link
        href="/clinic/claims"
        className="mb-4 inline-flex items-center gap-2 text-sm text-teal-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to claims
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        {/* Chat — full-height sticky panel on the right rail */}
        <div className="order-5 min-w-0 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-end-7 lg:self-start lg:sticky lg:top-4 lg:h-[560px]">
          <ClaimChat
            claimId={claimId}
            apiBase={`/api/clinic/reimbursements/${claimId}/messages`}
            variant="panel"
          />
        </div>

        {/* Header */}
        <div className="order-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">
                {formatClinicAmount(claim.amount)}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Claim {claim.claimNumber ?? claim.reimbursementId}
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${style.className}`}
            >
              {style.label}
            </span>
          </div>
        </div>

        {/* Details card */}
        <div className="order-2 min-w-0">
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start gap-3 p-5">
              <Hash className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Employee code
                </p>
                <p className="mt-0.5 font-mono text-sm font-medium text-slate-700">
                  {claim.employeeCode ?? "—"}
                </p>
              </div>
            </div>

            {claim.clinicName ? (
              <div className="flex items-start gap-3 p-5">
                <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Clinic</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-700">
                    {claim.clinicName}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex items-start gap-3 p-5">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Description
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">
                  {claim.description}
                </p>
              </div>
            </div>

            {claim.serviceDate ? (
              <div className="flex items-start gap-3 p-5">
                <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Service date
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-700">
                    {claim.serviceDate}
                  </p>
                </div>
              </div>
            ) : null}

            {claim.sessionCount ? (
              <div className="flex items-start gap-3 p-5">
                <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Sessions
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-700">
                    {claim.sessionCount} session{claim.sessionCount === 1 ? "" : "s"}
                    {claim.sessionTypes?.length
                      ? ` · ${claim.sessionTypes.join(", ")}`
                      : ""}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex items-start gap-3 p-5">
              <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Submitted
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-700">
                  {formatClinicDateTime(claim.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-5">
              <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Last updated
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-700">
                  {formatClinicDateTime(claim.updatedAt)}
                </p>
              </div>
            </div>

            {claim.receiptUrl ? (
              <div className="flex items-start gap-3 p-5">
                <Receipt className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Receipt
                  </p>
                  <a
                    href={claim.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-block text-sm font-medium text-teal-700 hover:underline"
                  >
                    View receipt
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* History */}
        {claim.history && claim.history.length > 0 ? (
          <div className="order-3 min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-4 text-xs uppercase tracking-wide text-slate-400">
                Claim history
              </p>
              <ol className="space-y-4">
                {claim.history.map((entry, index) => {
                  const entryStyle = clinicStatusStyle(entry.status);
                  return (
                    <li key={index} className="flex gap-3">
                      <span
                        className={`mt-0.5 inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[10px] font-semibold ${entryStyle.className}`}
                      >
                        {entryStyle.label}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-600">
                          {entry.note || entry.status.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatClinicDateTime(entry.timestamp)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        ) : null}

        {/* Requests — below the history timeline */}
        <div className="order-4 min-w-0">
          <ClaimRequests
            claimId={claimId}
            apiBase={`/api/reimbursements/${claimId}/requests`}
            canCreate
          />
        </div>
      </div>
    </div>
  );
}
