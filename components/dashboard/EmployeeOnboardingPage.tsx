"use client";

import { useState, useMemo, useContext } from "react";
import {
  Upload,
  Download,
  Users,
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Send,
  Copy,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  ExternalLink,
  UserPlus,
  Filter,
  Search,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { SectionCard, StatCard } from "@/components/dashboard/DashboardPrimitives";
import { useTheme } from "@/runtime/theme/useTheme";
import { RuntimeContext } from "@/runtime/context/RuntimeContext";
import {
  useOnboardingStats,
  useImportHistory,
  useInvitations,
  type InvitationRecord,
} from "@/lib/useOnboardingData";
import * as onboardingActions from "@/lib/onboardingActions";
import {
  uploadCsv,
  confirmCsvImport,
  getImportTemplateUrl,
  type CsvImportValidationResult,
} from "@/lib/onboardingActions";
import {
  getInvitationStatusColor,
  getInvitationStatusLabel,
  type EmployeeOnboardingRecord,
  type ImportHistoryEntry,
} from "@/lib/employeeOnboardingMockData";

// ── Types ─────────────────────────────────────────────────────────────────

type InvitationFilter =
  | "all"
  | "not_invited"
  | "pending"
  | "registered"
  | "expired"
  | "cancelled";

interface ToastMessage {
  id: string;
  text: string;
  type: "success" | "info";
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Map API InvitationRecord status to the UI EmployeeOnboardingRecord status. */
function mapInvitationStatus(
  apiStatus: string,
): EmployeeOnboardingRecord["invitationStatus"] {
  switch (apiStatus) {
    case "pending":
    case "sent":
    case "opened":
      return "pending";
    case "completed":
      return "registered";
    case "expired":
    case "bounced":
      return "expired";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

/** Transform an API InvitationRecord into the UI EmployeeOnboardingRecord shape. */
function invitationToRecord(inv: InvitationRecord): EmployeeOnboardingRecord {
  return {
    id: inv.invitationId,
    employeeCode: inv.employeeCode,
    email: inv.email,
    name: null, // InvitationDocument does not store name
    invitationStatus: mapInvitationStatus(inv.status),
    invitedAt: inv.sentAt ?? inv.createdAt,
    expiresAt: inv.expiresAt,
  };
}

/** Transform a CampaignRecord (import proxy) into ImportHistoryEntry shape. */
function campaignToImportHistory(
  c: { campaignId: string; name: string; status: string; totalRecipients: number; completedCount: number; createdAt: string },
): ImportHistoryEntry {
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

// ── Component ─────────────────────────────────────────────────────────────

export default function EmployeeOnboardingPage() {
  const theme = useTheme();
  const { config } = useContext(RuntimeContext);
  if (!config) return null;
  const tenantId = config.tenant.id;

  // ── Data hooks ──
  const stats = useOnboardingStats(tenantId);
  const importHistory = useImportHistory(tenantId);
  const invitations = useInvitations(tenantId, { limit: 1000 });

  // ── UI state ──
  const [invitationFilter, setInvitationFilter] =
    useState<InvitationFilter>("pending");
  const [invitationSearch, setInvitationSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [uploadResult, setUploadResult] =
    useState<CsvImportValidationResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);

  // ── Toast helper ──
  function addToast(text: string, type: "success" | "info" = "success") {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }

  // ── Derive categorized invitation lists from API data ──
  const categorized = useMemo(() => {
    const all = (invitations.data?.invitations ?? []).map(invitationToRecord);
    return {
      all,
      not_invited: [] as EmployeeOnboardingRecord[],
      pending: all.filter((e) => e.invitationStatus === "pending"),
      registered: all.filter((e) => e.invitationStatus === "registered"),
      expired: all.filter((e) => e.invitationStatus === "expired"),
      cancelled: all.filter((e) => e.invitationStatus === "cancelled"),
    };
  }, [invitations.data]);

  // ── Filter/search logic ──
  const counts = {
    all: categorized.all.length,
    not_invited: 0,
    pending: categorized.pending.length,
    registered: categorized.registered.length,
    expired: categorized.expired.length,
    cancelled: categorized.cancelled.length,
  };

  const filtered = useMemo(() => {
    let list = categorized[invitationFilter] ?? categorized.all;
    if (invitationSearch.trim()) {
      const q = invitationSearch.toLowerCase();
      list = list.filter(
        (e) =>
          e.employeeCode.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          (e.name && e.name.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [categorized, invitationFilter, invitationSearch]);

  // ── Selection helpers ──
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  }

  // ── Tab definitions ──
  const tabs: {
    id: InvitationFilter;
    label: string;
    count: number;
    color: string;
  }[] = [
    {
      id: "all",
      label: "All",
      count: counts.all,
      color: "bg-slate-100 text-slate-700",
    },
    {
      id: "not_invited",
      label: "Not Invited",
      count: counts.not_invited,
      color: "bg-slate-100 text-slate-600",
    },
    {
      id: "pending",
      label: "Pending",
      count: counts.pending,
      color: "bg-amber-100 text-amber-700",
    },
    {
      id: "registered",
      label: "Registered",
      count: counts.registered,
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      id: "expired",
      label: "Expired",
      count: counts.expired,
      color: "bg-red-100 text-red-700",
    },
    {
      id: "cancelled",
      label: "Cancelled",
      count: counts.cancelled,
      color: "bg-slate-200 text-slate-500",
    },
  ];

  // ── Transform import history ──
  const importHistoryEntries = useMemo(
    () => (importHistory.data ?? []).map(campaignToImportHistory),
    [importHistory.data],
  );

  // ── Stats data (fall back to zeros when loading) ──
  const overview = stats.data ?? {
    totalEmployees: 0,
    activeEmployees: 0,
    pendingRegistration: 0,
    inactiveEmployees: 0,
  };

  // ── Bulk action handlers (real API calls) ──

  async function handleSendSelected() {
    if (selectedIds.size === 0) {
      addToast("No employees selected for Send.", "info");
      return;
    }
    try {
      const ids = Array.from(selectedIds);
      const result = await onboardingActions.sendBulkInvitations(ids);
      addToast(
        `Sent to ${result.sent} employee${result.sent !== 1 ? "s" : ""}.${result.failed > 0 ? ` ${result.failed} failed.` : ""}`,
        "success",
      );
      setSelectedIds(new Set());
      invitations.refetch();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to send invitations",
        "info",
      );
    }
  }

  async function handleResendSelected() {
    if (selectedIds.size === 0) {
      addToast("No employees selected for Resend.", "info");
      return;
    }
    try {
      const ids = Array.from(selectedIds);
      const result = await onboardingActions.sendBulkInvitations(ids);
      addToast(
        `Resent to ${result.sent} employee${result.sent !== 1 ? "s" : ""}.`,
        "success",
      );
      setSelectedIds(new Set());
      invitations.refetch();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to resend invitations",
        "info",
      );
    }
  }

  function handleCopyLinkSelected() {
    if (selectedIds.size === 0) {
      addToast("No employees selected.", "info");
      return;
    }
    navigator.clipboard?.writeText(
      `${window.location.origin}/reimbursement/employee/register`,
    );
    addToast(
      `Registration link copied for ${selectedIds.size} employee${selectedIds.size !== 1 ? "s" : ""}.`,
      "success",
    );
  }

  async function handleCancelSelected() {
    if (selectedIds.size === 0) {
      addToast("No employees selected for Cancel.", "info");
      return;
    }
    try {
      const ids = Array.from(selectedIds);
      const result = await onboardingActions.cancelBulkInvitations(ids);
      addToast(
        `Cancelled ${result.cancelled} invitation${result.cancelled !== 1 ? "s" : ""}.`,
        "success",
      );
      setSelectedIds(new Set());
      invitations.refetch();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to cancel invitations",
        "info",
      );
    }
  }

  // ── Per-row action handlers ──

  async function handleRowSend(employee: EmployeeOnboardingRecord) {
    try {
      await onboardingActions.sendInvitation(employee.id);
      addToast(`Invitation sent to ${employee.employeeCode}.`, "success");
      invitations.refetch();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to send invitation",
        "info",
      );
    }
  }

  async function handleRowResend(employee: EmployeeOnboardingRecord) {
    try {
      await onboardingActions.resendInvitation(employee.id);
      addToast(`Invitation resent to ${employee.employeeCode}.`, "success");
      invitations.refetch();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to resend invitation",
        "info",
      );
    }
  }

  function handleRowCopyLink(employee: EmployeeOnboardingRecord) {
    navigator.clipboard?.writeText(
      `${window.location.origin}/reimbursement/employee/register`,
    );
    addToast(`Link copied for ${employee.employeeCode}.`, "success");
  }

  // ── CSV Upload handlers ──

  async function handleFileSelect(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await uploadCsv(tenantId, file);
      setUploadResult(result);
      addToast(
        `Validation complete: ${result.valid} valid, ${result.errors} errors.`,
        result.errors > 0 ? "info" : "success",
      );
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Upload failed.",
        "info",
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
      addToast(`${result.created} employees created successfully.`, "success");
      setUploadResult(null);
      // Refetch dashboard data
      stats.refetch();
      importHistory.refetch();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Import failed.",
        "info",
      );
    } finally {
      setImporting(false);
    }
  }

  // ── Render ──

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={String(overview.totalEmployees)}
          caption="All employee records in the system."
          icon={<Users className="h-4 w-4" />}
          accentColor={theme.chartColors.info}
        />
        <StatCard
          title="Active"
          value={String(overview.activeEmployees)}
          caption="Employees who have completed registration."
          icon={<UserPlus className="h-4 w-4" />}
          accentColor={theme.chartColors.success}
        />
        <StatCard
          title="Pending Registration"
          value={String(overview.pendingRegistration)}
          caption="Created but not yet registered."
          icon={<Clock className="h-4 w-4" />}
          accentColor={theme.chartColors.warning}
        />
        <StatCard
          title="Inactive"
          value={String(overview.inactiveEmployees)}
          caption="Deactivated or suspended accounts."
          icon={<XCircle className="h-4 w-4" />}
          accentColor={theme.chartColors.danger}
        />
      </section>

      {/* Stats: loading indicator */}
      {stats.loading && (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading stats…
        </div>
      )}

      {/* Stats: error state */}
      {stats.error && (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-700">{stats.error}</p>
          <button
            type="button"
            onClick={stats.refetch}
            className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* Section 1: Employee Import */}
      <SectionCard
        title="Employee Import"
        description="Upload a CSV file to bulk-import employees into your organization."
      >
        <div className="space-y-6">
          {/* Upload Area */}
          <input
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            id="csv-upload-input"
            onChange={handleFileSelect}
          />
          <label
            htmlFor="csv-upload-input"
            className="flex cursor-pointer flex-col items-center gap-3 rounded-[1.25rem] border-2 border-dashed px-6 py-10 text-center transition hover:bg-slate-50"
            style={{ borderColor: theme.borderAccent }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: theme.surfaceAccentStrong }}
            >
              <FileSpreadsheet
                className="h-6 w-6"
                style={{ color: theme.linkColor }}
              />
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

          {/* Validation Preview Modal */}
          {uploadResult && (
            <div
              className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12"
              onClick={() => setUploadResult(null)}
            >
              <div
                className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Import Preview
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Review the parsed records below before importing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadResult(null)}
                    className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Validation Summary */}
                <div className="mb-5 flex flex-wrap gap-3">
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
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
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
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

                {/* Footer Actions */}
                <div className="mt-5 flex items-center justify-end gap-3">
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
              </div>
            </div>
          )}

          {/* Import History Section */}
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
                <RefreshCw className="h-3 w-3" />
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
                    className="flex items-center justify-between gap-4 rounded-xl border bg-white px-4 py-3"
                    style={{ borderColor: theme.borderAccent }}
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
            /* Empty state — no imports yet */
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Upload className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                No imports yet. Upload a CSV file to get started.
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Section 2: Invitation Management */}
      <SectionCard
        title="Invitation Management"
        description="Send invitations and track registration progress."
      >
        <div className="space-y-5">
          {/* Loading state for the whole invitations section */}
          {invitations.loading && (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              <span className="text-sm text-slate-500">
                Loading invitations…
              </span>
            </div>
          )}

          {/* Error state */}
          {invitations.error && (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-700">{invitations.error}</p>
              <button
                type="button"
                onClick={invitations.refetch}
                className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          )}

          {/* Bulk Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : "Select employees below to send invitations"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSendSelected}
                disabled={selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
                Send Invitation
              </button>
              <button
                type="button"
                onClick={handleResendSelected}
                disabled={selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Mail className="h-3.5 w-3.5" />
                Resend
              </button>
              <button
                type="button"
                onClick={handleCopyLinkSelected}
                disabled={selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Link
              </button>
              <button
                type="button"
                onClick={handleCancelSelected}
                disabled={selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setInvitationFilter(tab.id);
                  setSelectedIds(new Set());
                }}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition ${
                  invitationFilter === tab.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${tab.color}`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, email, or name..."
              value={invitationSearch}
              onChange={(e) => setInvitationSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Invitation Table or Empty State */}
          {!invitations.loading && !invitations.error && filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Filter className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                {invitationFilter === "all"
                  ? "No employees found. Import employees to get started."
                  : `No ${tabs.find((t) => t.id === invitationFilter)?.label.toLowerCase()} invitations.`}
              </p>
            </div>
          ) : !invitations.loading && !invitations.error ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.size === filtered.length &&
                          filtered.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                    </th>
                    <th className="px-3 py-3 font-semibold text-slate-600">
                      Employee Code
                    </th>
                    <th className="hidden px-3 py-3 font-semibold text-slate-600 sm:table-cell">
                      Email
                    </th>
                    <th className="hidden px-3 py-3 font-semibold text-slate-600 md:table-cell">
                      Name
                    </th>
                    <th className="px-3 py-3 font-semibold text-slate-600">
                      Status
                    </th>
                    <th className="px-3 py-3 font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-b border-slate-50 transition hover:bg-slate-50"
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(employee.id)}
                          onChange={() => toggleSelect(employee.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-700">
                        {employee.employeeCode}
                      </td>
                      <td className="hidden px-3 py-3 text-slate-600 sm:table-cell">
                        {employee.email}
                      </td>
                      <td className="hidden px-3 py-3 text-slate-600 md:table-cell">
                        {employee.name ?? (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getInvitationStatusColor(employee.invitationStatus)}`}
                        >
                          {getInvitationStatusLabel(employee.invitationStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {employee.invitationStatus === "not_invited" && (
                            <button
                              type="button"
                              onClick={() => handleRowSend(employee)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                              title="Send Invitation"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {employee.invitationStatus === "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRowResend(employee)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                                title="Resend"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRowCopyLink(employee)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                title="Copy Registration Link"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {employee.invitationStatus === "expired" && (
                            <button
                              type="button"
                              onClick={() => handleRowResend(employee)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                              title="Resend"
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {employee.invitationStatus === "registered" && (
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-slate-400"
                              title="View Profile"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Inline note when no invitations exist yet */}
          {!invitations.loading &&
            !invitations.error &&
            invitations.data?.invitations.length === 0 &&
            invitationFilter === "all" && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Mail className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">
                  No invitations yet. Import employees and create a campaign to
                  get started.
                </p>
              </div>
            )}
        </div>
      </SectionCard>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-slide-up rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${
              toast.type === "success" ? "bg-emerald-600" : "bg-slate-700"
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}
