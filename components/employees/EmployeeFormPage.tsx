"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, CheckCircle } from "lucide-react";

interface EmployeeFormPageProps {
  mode: "create";
  employeeId?: never;
}

interface FormData {
  employeeCode: string;
  email: string;
}

const INITIAL_FORM: FormData = {
  employeeCode: "",
  email: "",
};

export default function EmployeeFormPage({ mode: _mode }: EmployeeFormPageProps) {
  const router = useRouter();

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [createdEmail, setCreatedEmail] = useState("");

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!form.employeeCode.trim()) {
      errors.employeeCode = "Employee code is required.";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(form.employeeCode.trim())) {
      errors.employeeCode = "Use only letters, numbers, hyphens, and underscores.";
    }

    if (!form.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Please enter a valid email address.";
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
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: form.employeeCode.trim(),
          email: form.email.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save employee.");
      }

      setCreatedEmail(form.email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
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

  // Success state
  if (success) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-emerald-900">Employee Added</h2>
          <p className="mt-2 text-sm text-emerald-700">
            An invitation has been created for {createdEmail}. The employee can visit the portal and register using their employee code and email address.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => { setSuccess(false); setForm(INITIAL_FORM); }}
              className="rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
            >
              Add Another
            </button>
            <button
              type="button"
              onClick={() => router.push("/employees")}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Back to List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
          Add Employee
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
          Add Employee
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
        {/* Employee Code */}
        <div>
          <label htmlFor="employeeCode" className="mb-1.5 block text-sm font-medium text-slate-700">
            Employee Code <span className="text-red-500">*</span>
          </label>
          <input
            id="employeeCode"
            type="text"
            value={form.employeeCode}
            onChange={(e) => updateField("employeeCode", e.target.value)}
            placeholder="e.g. EMP-001"
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
              fieldErrors.employeeCode ? "border-red-300" : "border-slate-200 focus:border-blue-300"
            }`}
          />
          {fieldErrors.employeeCode && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.employeeCode}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="e.g. john@company.com"
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
              fieldErrors.email ? "border-red-300" : "border-slate-200 focus:border-blue-300"
            }`}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => router.push("/employees")}
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
              "Add Employee"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
