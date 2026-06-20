"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";

interface Employee {
  employeeId: string;
  name: string;
  employeeCode: string;
}

interface ReimbursementFormPageProps {
  mode: "create";
  reimbursementId?: string;
}

interface FormData {
  employeeId: string;
  employeeName: string;
  type: string;
  amount: string;
  description: string;
  receiptUrl: string;
}

const INITIAL_FORM: FormData = {
  employeeId: "",
  employeeName: "",
  type: "medical",
  amount: "",
  description: "",
  receiptUrl: "",
};

const CLAIM_TYPES = [
  { value: "medical", label: "Medical" },
  { value: "travel", label: "Travel" },
  { value: "education", label: "Education" },
  { value: "transport", label: "Transport" },
  { value: "housing", label: "Housing" },
  { value: "other", label: "Other" },
];

export default function ReimbursementFormPage({ mode: _mode }: ReimbursementFormPageProps) {
  const router = useRouter();

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch employee list for dropdown
  const fetchEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const res = await fetch("/api/employees?limit=500");
      if (!res.ok) throw new Error("Failed to load employees.");
      const data = await res.json();
      setEmployees(data.employees ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees.");
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!form.employeeId) {
      errors.employeeId = "Please select an employee.";
    }

    if (!form.type) {
      errors.type = "Claim type is required.";
    }

    if (!form.amount || parseFloat(form.amount) <= 0) {
      errors.amount = "Amount must be greater than 0.";
    }

    if (!form.description.trim()) {
      errors.description = "Description is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    setError(null);

    try {
      const selectedEmployee = employees.find(
        (emp) => emp.employeeId === form.employeeId,
      );

      const res = await fetch("/api/reimbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          employeeName: selectedEmployee?.name ?? form.employeeName,
          type: form.type,
          amount: parseFloat(form.amount),
          description: form.description.trim(),
          receiptUrl: form.receiptUrl.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create claim.");
      }

      router.push("/reimbursements");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  // Auto-fill employee name when employee is selected
  function handleEmployeeChange(value: string) {
    const selected = employees.find((emp) => emp.employeeId === value);
    setForm((prev) => ({
      ...prev,
      employeeId: value,
      employeeName: selected?.name ?? "",
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.employeeId;
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
          New Claim
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
          Create New Claim
        </h2>
      </div>

      {/* Save error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {/* Employee Select */}
        <div>
          <label
            htmlFor="employee"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Employee <span className="text-red-500">*</span>
          </label>
          {loadingEmployees ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Loading employees...
            </div>
          ) : (
            <>
              <select
                id="employee"
                value={form.employeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  fieldErrors.employeeId
                    ? "border-red-300"
                    : "border-slate-200 focus:border-blue-300"
                }`}
              >
                <option value="">Select an employee...</option>
                {employees.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.name} ({emp.employeeCode})
                  </option>
                ))}
              </select>
              {employees.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No employees found.{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/employees/new")}
                    className="text-blue-600 underline"
                  >
                    Create one first
                  </button>
                </p>
              )}
            </>
          )}
          {fieldErrors.employeeId && (
            <p className="mt-1 text-xs text-red-600">
              {fieldErrors.employeeId}
            </p>
          )}
        </div>

        {/* Claim Type */}
        <div>
          <label
            htmlFor="type"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Claim Type <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            value={form.type}
            onChange={(e) => updateField("type", e.target.value)}
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
              fieldErrors.type
                ? "border-red-300"
                : "border-slate-200 focus:border-blue-300"
            }`}
          >
            {CLAIM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {fieldErrors.type && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.type}</p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label
            htmlFor="amount"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              $
            </span>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => updateField("amount", e.target.value)}
              placeholder="0.00"
              className={`w-full rounded-lg border bg-white py-2.5 pl-8 pr-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                fieldErrors.amount
                  ? "border-red-300"
                  : "border-slate-200 focus:border-blue-300"
              }`}
            />
          </div>
          {fieldErrors.amount && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.amount}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            rows={3}
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Describe the claim..."
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
              fieldErrors.description
                ? "border-red-300"
                : "border-slate-200 focus:border-blue-300"
            }`}
          />
          {fieldErrors.description && (
            <p className="mt-1 text-xs text-red-600">
              {fieldErrors.description}
            </p>
          )}
        </div>

        {/* Receipt URL (optional) */}
        <div>
          <label
            htmlFor="receiptUrl"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Receipt URL (optional)
          </label>
          <input
            id="receiptUrl"
            type="url"
            value={form.receiptUrl}
            onChange={(e) => updateField("receiptUrl", e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm placeholder-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => router.push("/reimbursements")}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Create Claim"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
