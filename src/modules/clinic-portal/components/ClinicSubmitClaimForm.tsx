"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react";

interface ClinicScopeEntry {
  clinicId: string;
  name: string;
}

interface TenantScopeEntry {
  tenantId: string;
  name: string;
}

interface ClinicSubmitClaimFormProps {
  clinics: ClinicScopeEntry[];
  tenants: TenantScopeEntry[];
}

const SESSION_FOR_OPTIONS = [
  { value: "individual", label: "Individual session" },
  { value: "couple", label: "Couple session" },
  { value: "family", label: "Family session" },
  { value: "assessment", label: "Assessment" },
  { value: "other", label: "Other" },
] as const;

const SESSION_TYPES = [
  "Psychiatric",
  "Psychology",
  "Occupational Therapy",
  "Speech & Language",
  "Other",
] as const;

export function ClinicSubmitClaimForm({
  clinics,
  tenants,
}: ClinicSubmitClaimFormProps) {
  const router = useRouter();

  const [clinicId, setClinicId] = useState(clinics[0]?.clinicId ?? "");
  const [tenantId, setTenantId] = useState(tenants[0]?.tenantId ?? "");
  const [employeeCode, setEmployeeCode] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [sessionCount, setSessionCount] = useState("");
  const [sessionFor, setSessionFor] = useState("");
  const [sessionForOther, setSessionForOther] = useState("");
  const [sessionTypes, setSessionTypes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasNoScope = clinics.length === 0 || tenants.length === 0;

  function toggleSessionType(value: string) {
    setSessionTypes((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(null);

    const amountValue = Number(amount);
    if (!clinicId) {
      setError("Select a clinic.");
      return;
    }
    if (!tenantId) {
      setError("Select an organization.");
      return;
    }
    if (!employeeCode.trim()) {
      setError("Employee code is required.");
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    const payload: Record<string, unknown> = {
      clinicId,
      tenantId,
      employeeCode: employeeCode.trim(),
      amount: amountValue,
      description: description.trim(),
    };
    if (serviceDate) payload.serviceDate = serviceDate;
    if (sessionCount) payload.sessionCount = Number(sessionCount);
    if (sessionFor) payload.sessionFor = sessionFor;
    if (sessionFor === "other" && sessionForOther.trim()) {
      payload.sessionForOther = sessionForOther.trim();
    }
    if (sessionTypes.length > 0) payload.sessionTypes = sessionTypes;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/clinic/reimbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to submit claim.");
      }
      const reference = data.claim?.claimNumber ?? data.claim?.reimbursementId ?? "";
      setSuccess(
        `Claim submitted successfully${reference ? ` (${reference})` : ""}.`,
      );
      setTimeout(() => router.replace("/clinic/claims"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit claim.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={() => router.push("/clinic/claims")}
        className="mb-4 inline-flex items-center gap-2 text-sm text-teal-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to claims
      </button>

      <h1 className="text-xl font-semibold text-slate-800">Submit a claim</h1>
      <p className="mt-1 text-sm text-slate-500">
        Claims are filed against the employee&apos;s code so their identity stays
        anonymous to the clinic.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {hasNoScope ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Your clinic account is not linked to any clinic or organization yet.
              Contact your administrator to set up access before submitting claims.
            </span>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="clinicId"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Clinic
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <select
                    id="clinicId"
                    value={clinicId}
                    onChange={(event) => setClinicId(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  >
                    {clinics.map((clinic) => (
                      <option key={clinic.clinicId} value={clinic.clinicId}>
                        {clinic.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="tenantId"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Organization
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <select
                    id="tenantId"
                    value={tenantId}
                    onChange={(event) => setTenantId(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  >
                    {tenants.map((tenant) => (
                      <option key={tenant.tenantId} value={tenant.tenantId}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="employeeCode"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Employee code
              </label>
              <input
                id="employeeCode"
                type="text"
                autoComplete="off"
                value={employeeCode}
                onChange={(event) => setEmployeeCode(event.target.value)}
                placeholder="e.g. EMP-1001"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
              <p className="mt-1 text-xs text-slate-400">
                The employee&apos;s code, not their name — this keeps the claim
                anonymous.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="amount"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Amount (OMR)
                </label>
                <input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.001"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.000"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label
                  htmlFor="serviceDate"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Service date
                </label>
                <input
                  id="serviceDate"
                  type="date"
                  value={serviceDate}
                  onChange={(event) => setServiceDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the service or treatment provided…"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="sessionCount"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Session count
                </label>
                <input
                  id="sessionCount"
                  type="number"
                  min="1"
                  value={sessionCount}
                  onChange={(event) => setSessionCount(event.target.value)}
                  placeholder="e.g. 1"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label
                  htmlFor="sessionFor"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Session for
                </label>
                <select
                  id="sessionFor"
                  value={sessionFor}
                  onChange={(event) => setSessionFor(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Select…</option>
                  {SESSION_FOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {sessionFor === "other" ? (
              <div>
                <label
                  htmlFor="sessionForOther"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Specify session type
                </label>
                <input
                  id="sessionForOther"
                  type="text"
                  value={sessionForOther}
                  onChange={(event) => setSessionForOther(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            ) : null}

            <div>
              <p className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Session types
              </p>
              <div className="flex flex-wrap gap-2">
                {SESSION_TYPES.map((type) => {
                  const selected = sessionTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleSessionType(type)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        selected
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {success ? (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSubmitting ? "Submitting…" : "Submit claim"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
