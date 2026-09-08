"use client";

import { useState, useContext } from "react";
import {
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { RuntimeContext } from "@/runtime/context/RuntimeContext";
import { useImportHistory } from "@/lib/useOnboardingData";
import {
  uploadCsv,
  confirmCsvImport,
  getImportTemplateUrl,
  type CsvImportValidationResult,
} from "@/lib/onboardingActions";
import {
  getInvitationStatusColor,
  getInvitationStatusLabel,
  type ImportHistoryEntry,
} from "@/lib/employeeOnboardingMockData";

interface EmployeeImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess?: (created: number) => void;
}

function campaignToImportHistory(c: {
  campaignId: string;
  name: string;
  status: string;
  totalRecipients: number;
  completedCount: number;
  createdAt: string;
}): ImportHistoryEntry {
  let status: ImportHistoryEntry["status"];
  switch (c.status) {
    case "completed":
      status = "completed";
      break;
    case "cancelled":
      status = "failed";
      break;
    default:
      status = "partial";
  }
  return {
    id: c.campaignId,
    filename: c.name,
    uploadedAt: c.createdAt,
    totalRows: c.totalRecipients,
    validRows: c.completedCount,
    errorRows: c.totalRecipients - c.completedCount,
    createdCount: c.completedCount,
    status,
  };
}

export default function EmployeeImportModal({
  open,
  onClose,
  onImportSuccess,
}: EmployeeImportModalProps) {
  const { config } = useContext(RuntimeContext);
  if (!config) return null;
  const tenantId = config.tenant.id;

  const importHistory = useImportHistory(tenantId);
  const [uploadResult, setUploadResult] =
    useState<CsvImportValidationResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "info" } | null>(null);

  const importHistoryEntries = (
    importHistory.data ?? []
  ).map(campaignToImportHistory);

  function showToast(text: string, type: "success" | "info" = "success") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await uploadCsv(tenantId, file);
      setUploadResult(result);
      showToast(
        `Validation complete: ${result.valid} valid, ${result.errors} errors.`,
        result.errors > 0 ? "info" : "success"
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Upload failed.",
        "info"
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleConfirmImport() {
    if (!uploadResult || uploadResult.valid === 0) return;
    const validRows = uploadResult.rows
      .filter((r) => r.valid)
      .map((r) => ({
        employeeCode: r.employeeCode,
        email: r.email,
      }));
    setImporting(true);
    try {
      const result = await confirmCsvImport(tenantId, validRows);
      showToast(`${result.created} employees created successfully.`, "success");
      setUploadResult(null);
      importHistory.refetch();
      onImportSuccess?.(result.created);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Import failed.",
        "info"
      );
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setUploadResult(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Import Employees"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Import Employees
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Upload a CSV file to bulk-import employees into your organization.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            {/* Upload Area */}
            <input
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              id="csv-upload-input-modal"
              onChange={handleFileSelect}
            />
            <label
              htmlFor="csv-upload-input-modal"
              className="flex cursor-pointer flex-col items-center gap-3 rounded-[1.25rem] border-2 border-dashed border-slate-200 px-6 py-10 text-center transition hover:bg-slate-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <FileSpreadsheet className="h-6 w-6 text-slate-500" />
              </div>
              <div>
                {uploading ? (
                  <p className="text-sm font-semibold text-slate-800">
                    Validating file...
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-slate-800">
                    Drop your file here, or click to browse
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  Upload a .csv or .xlsx file with columns: employeeCode, email
                </p>
              </div>
            </label>

            {/* Template Download */}
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-slate-400" />
              <a
                href={getImportTemplateUrl()}
                download
                className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
              >
                Download CSV Template
              </a>
            </div>

            {/* Validation Preview */}
            {uploadResult && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="mb-4 text-base font-semibold text-slate-900">
                  Import Preview
                </h3>

                {/* Validation Summary */}
                <div className="mb-4 flex flex-wrap gap-3">
                  <div className="rounded-xl bg-white px-4 py-3">
                    <p className="text-xs text-slate-500">Total Rows</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {uploadResult.total}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-4 py-3">
                    <p className="text-xs text-emerald-600">Valid</p>
                    <p className="text-lg font-semibold text-emerald-700">
                      {uploadResult.valid}
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 px-4 py-3">
                    <p className="text-xs text-red-600">Errors</p>
                    <p className="text-lg font-semibold text-red-700">
                      {uploadResult.errors}
                    </p>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-3 py-2 text-xs font-semibold text-slate-500">#</th>
                        <th className="px-3 py-2 text-xs font-semibold text-slate-500">Code</th>
                        <th className="px-3 py-2 text-xs font-semibold text-slate-500">Email</th>
                        <th className="px-3 py-2 text-xs font-semibold text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.rows.map((row) => (
                        <tr
                          key={row.row}
                          className={`border-b border-slate-100 ${row.valid ? "" : "bg-red-50"}`}
                        >
                          <td className="px-3 py-2 text-xs text-slate-400">{row.row}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.employeeCode}</td>
                          <td className="px-3 py-2 text-xs text-slate-600">{row.email}</td>
                          <td className="px-3 py-2">
                            {row.valid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                <AlertTriangle className="h-3 w-3" />
                                {row.errors[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import History */}
            {importHistory.loading ? (
              <div className="flex items-center justify-center gap-2 py-6">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span className="text-sm text-slate-400">
                  Loading import history…
                </span>
              </div>
            ) : importHistory.error ? (
              <div className="flex items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-700">{importHistory.error}</p>
                <button
                  type="button"
                  onClick={importHistory.refetch}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200"
                >
                  Retry
                </button>
              </div>
            ) : importHistoryEntries.length > 0 ? (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Import History
                </h3>
                <div className="space-y-2">
                  {importHistoryEntries.map((imp) => (
                    <div
                      key={imp.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {imp.filename}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(imp.uploadedAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" — "}
                            {imp.totalRows} rows, {imp.createdCount} created
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          imp.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : imp.status === "partial"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {imp.status === "completed"
                          ? "Completed"
                          : imp.status === "partial"
                            ? "Partial"
                            : "Failed"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Upload className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">
                  No imports yet. Upload a CSV file to get started.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {uploadResult && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={() => setUploadResult(null)}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {uploadResult.errors > 0 ? "Discard & Start Over" : "Cancel"}
            </button>
            {uploadResult.valid > 0 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? (
                  <>Importing...</>
                ) : (
                  <>Create {uploadResult.valid} Employee{uploadResult.valid !== 1 ? "s" : ""}</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-slate-700"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
