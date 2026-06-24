"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Upload, X, FileText } from "lucide-react";
import { clinicsData, type Clinic } from "@/data/clinics";

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
  clinicId: string;
  clinicName: string;
  amount: string;
  description: string;
  receiptUrl: string;
}

const INITIAL_FORM: FormData = {
  employeeId: "",
  employeeName: "",
  type: "reimbursement",
  clinicId: "",
  clinicName: "",
  amount: "",
  description: "",
  receiptUrl: "",
};

const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function ReimbursementFormPage({ mode: _mode }: ReimbursementFormPageProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

    if (!form.clinicId) {
      errors.clinicId = "Please select a clinic.";
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

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      setFilePreview(null);
      return;
    }

    const ext = "." + selected.name.split(".").pop()?.toLowerCase();
    const allowed = [".pdf", ".jpg", ".jpeg", ".png"];
    if (!allowed.includes(ext)) {
      setFieldErrors((prev) => ({ ...prev, receipt: "Receipt must be a PDF, JPG, or PNG file." }));
      setFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setFieldErrors((prev) => ({ ...prev, receipt: "Receipt file must be 10 MB or smaller." }));
      setFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.receipt;
      return next;
    });
    setFile(selected);

    if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
      setFilePreview(URL.createObjectURL(selected));
    } else {
      setFilePreview(null);
    }
  }, []);

  const removeFile = useCallback(() => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    setError(null);

    try {
      // 1. Upload file if selected
      let receiptUrl = form.receiptUrl;
      if (file) {
        setUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);

        const uploadRes = await fetch("/api/employee/receipts", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json().catch(() => ({ error: "Upload failed." }));
          throw new Error(uploadErr.error || "Failed to upload receipt.");
        }

        const uploadData = await uploadRes.json();
        receiptUrl = uploadData.url;
        setUploading(false);
      }

      // 2. Create claim
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
          clinicId: form.clinicId.trim() || undefined,
          clinicName: clinicsData.find((c) => c.slug === form.clinicId)?.name ?? "",
          amount: parseFloat(form.amount),
          description: form.description.trim(),
          receiptUrl: receiptUrl || undefined,
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
      setUploading(false);
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

  function handleClinicChange(value: string) {
    const selected = clinicsData.find((c) => c.slug === value);
    setForm((prev) => ({
      ...prev,
      clinicId: value,
      clinicName: selected?.name ?? "",
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.clinicId;
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

        {/* Clinic Select */}
        <div>
          <label
            htmlFor="clinic"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Clinic <span className="text-red-500">*</span>
          </label>
          <select
            id="clinic"
            value={form.clinicId}
            onChange={(e) => handleClinicChange(e.target.value)}
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
              fieldErrors.clinicId
                ? "border-red-300"
                : "border-slate-200 focus:border-blue-300"
            }`}
          >
            <option value="">Select a clinic...</option>
            {clinicsData.map((clinic) => (
              <option key={clinic.id} value={clinic.slug}>
                {clinic.name}
              </option>
            ))}
          </select>
          {fieldErrors.clinicId && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.clinicId}</p>
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
              OMR
            </span>
            <input
              id="amount"
              type="number"
              step="0.001"
              min="0.001"
              value={form.amount}
              onChange={(e) => updateField("amount", e.target.value)}
              placeholder="0.000"
              className={`w-full rounded-lg border bg-white py-2.5 pl-14 pr-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
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
            <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>
          )}
        </div>

        {/* Receipt Upload */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Receipt
          </label>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              fieldErrors.receipt
                ? "border-red-300 bg-red-50"
                : file
                  ? "border-green-300 bg-green-50"
                  : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
            }}
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              disabled={saving}
              className="hidden"
            />

            {file && filePreview ? (
              <div className="space-y-2 relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors"
                  aria-label="Remove receipt"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <img src={filePreview} alt="Receipt preview" className="max-h-40 mx-auto rounded" />
                <p className="text-sm text-slate-700 font-medium">{file.name}</p>
              </div>
            ) : file ? (
              <div className="space-y-2 relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors"
                  aria-label="Remove receipt"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <FileText className="w-10 h-10 text-blue-600 mx-auto" />
                <p className="text-sm text-slate-700 font-medium">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500">
                  <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-400">PDF, JPG, or PNG (max 10 MB)</p>
              </div>
            )}
          </div>
          {fieldErrors.receipt && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.receipt}</p>
          )}
          {form.receiptUrl && !file && (
            <p className="mt-1 text-xs text-slate-400">
              Current receipt URL: {form.receiptUrl}
            </p>
          )}
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
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving || uploading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {uploading ? "Uploading..." : "Saving..."}
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
