"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";

interface EmployeeFormPageProps {
  mode: "create" | "edit";
  employeeId?: string;
}

interface FormData {
  employeeCode: string;
  name: string;
  email: string;
  status: "active" | "inactive";
}

const INITIAL_FORM: FormData = {
  employeeCode: "",
  name: "",
  email: "",
  status: "active",
};

export default function EmployeeFormPage({ mode, employeeId }: EmployeeFormPageProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fetchEmployee = useCallback(async () => {
    if (!employeeId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/employees/${employeeId}`);
      if (!res.ok) {
        throw new Error("Employee not found.");
      }

      const employee = await res.json();
      setForm({
        employeeCode: employee.employeeCode,
        name: employee.name,
        email: employee.email,
        status: employee.status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employee.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (isEdit) {
      fetchEmployee();
    }
  }, [isEdit, fetchEmployee]);

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!form.employeeCode.trim()) {
      errors.employeeCode = "Employee ID is required.";
    }

    if (!form.name.trim()) {
      errors.name = "Name is required.";
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
      const url = isEdit ? `/api/employees/${employeeId}` : "/api/employees";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save employee.");
      }

      router.push("/employees");
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

  // Loading state (edit mode only)
  if (loading) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500">Loading employee...</p>
      </div>
    );
  }

  // Error state (edit mode fetch failure)
  if (error && isEdit && !saving) {
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
          {isEdit ? "Edit Employee" : "New Employee"}
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">
          {isEdit ? "Update Employee Information" : "Create New Employee"}
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
        {/* Employee ID */}
        <div>
          <label htmlFor="employeeCode" className="mb-1.5 block text-sm font-medium text-slate-700">
            Employee ID <span className="text-red-500">*</span>
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

        {/* Name */}
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="e.g. John Doe"
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
              fieldErrors.name ? "border-red-300" : "border-slate-200 focus:border-blue-300"
            }`}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
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

        {/* Status (edit only) */}
        {isEdit && (
          <div>
            <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {form.status === "inactive" && (
              <p className="mt-1.5 text-xs text-amber-600">
                Setting to inactive will soft-disable this employee. They can be re-enabled later.
              </p>
            )}
          </div>
        )}

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
              isEdit ? "Save Changes" : "Create Employee"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
