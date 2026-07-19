"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Snowflake,
  Eye,
  EyeOff,
  Edit3,
  Send,
  Save,
  X,
} from "lucide-react";

interface ClaimHistoryEntry {
  status: "pending" | "in_progress" | "approved" | "rejected" | "frozen" | "paid";
  actorId: string;
  actorRole: "employee" | "tenantAdmin";
  note?: string;
  timestamp: string;
}

interface Reimbursement {
  reimbursementId: string;
  claimNumber?: string;
  employeeId: string;
  type: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  receiptHash?: string;
  serviceDate?: string;
  sessionCount?: number;
  sessionTypes?: string[];
  sessionFor?: string;
  sessionForOther?: string;
  contactCountryCode?: string;
  contactNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  clinicId?: string;
  clinicName?: string;
  status: "pending" | "in_progress" | "approved" | "rejected" | "frozen" | "paid";
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  history?: ClaimHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  frozen: { label: "Frozen", color: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  paid: { label: "Paid", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
};

interface ReimbursementDetailPageProps {
  reimbursementId: string;
}

type ActionType = "approve" | "reject" | "freeze";

export default function ReimbursementDetailPage({ reimbursementId }: ReimbursementDetailPageProps) {
  const router = useRouter();
  const [reimbursement, setReimbursement] = useState<Reimbursement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<ActionType | null>(null);
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState({ amount: "", description: "", notes: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [updateModal, setUpdateModal] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateSending, setUpdateSending] = useState(false);

  const fetchReimbursement = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reimbursements/${reimbursementId}`);
      if (!res.ok) throw new Error("Claim not found.");
      const data = await res.json();
      setReimbursement(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [reimbursementId]);

  useEffect(() => { fetchReimbursement(); }, [fetchReimbursement]);

  async function handleAction(action: ActionType) {
    const trimmedNotes = notes.trim();
    if (action === "reject" && !trimmedNotes) {
      setNotesError("A reason is required when rejecting a claim.");
      return;
    }
    setNotesError(null);
    setActionLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/reimbursements/${reimbursementId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: trimmedNotes || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action} claim.`);
      }
      const data = await res.json();
      setReimbursement(data);
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setActionLoading(null);
    }
  }

  function startEditing() {
    if (!reimbursement) return;
    setEditFields({
      amount: String(reimbursement.amount),
      description: reimbursement.description,
      notes: "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!reimbursement) return;
    setEditSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        amount: parseFloat(editFields.amount),
        description: editFields.description.trim(),
      };
      if (editFields.notes.trim()) body.notes = editFields.notes.trim();

      const res = await fetch(`/api/reimbursements/${reimbursementId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update claim.");
      }
      const data = await res.json();
      setReimbursement(data);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setEditSaving(false);
    }
  }

  async function sendUpdate() {
    if (!updateMessage.trim()) return;
    setUpdateSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/reimbursements/${reimbursementId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: updateMessage.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send update.");
      }
      const data = await res.json();
      setReimbursement(data);
      setUpdateModal(false);
      setUpdateMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setUpdateSending(false);
    }
  }

  function formatCurrency(amount: number) {
    return `OMR ${amount.toFixed(3)}`;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500">Loading claim...</p>
      </div>
    );
  }

  if (error && !reimbursement) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
        <button type="button" onClick={() => router.push("/reimbursements")} className="text-sm font-medium text-blue-600 hover:text-blue-800">
          &larr; Back to claims
        </button>
      </div>
    );
  }

  if (!reimbursement) return null;

  const statusCfg = STATUS_CONFIG[reimbursement.status] ?? STATUS_CONFIG.pending;
  const canAct = reimbursement.status === "pending" || reimbursement.status === "frozen" || reimbursement.status === "in_progress";
  const canEdit = reimbursement.status === "pending" || reimbursement.status === "in_progress" || reimbursement.status === "frozen" || reimbursement.status === "rejected";
  const availableActions: ActionType[] =
    reimbursement.status === "frozen"
      ? ["approve", "reject"]
      : reimbursement.status === "pending" || reimbursement.status === "in_progress"
        ? ["approve", "reject", "freeze"]
        : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <button type="button" onClick={() => router.push("/reimbursements")} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        Back to claims
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Claim Detail</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {reimbursement.claimNumber ?? "Claim"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium capitalize ${statusCfg.color}`}>
            <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
          <button
            type="button"
            onClick={() => setUpdateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
          >
            <Send className="h-3.5 w-3.5" />
            Update
          </button>
          {canEdit && !editing && (
            <button type="button" onClick={startEditing} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Action error */}
      {error && reimbursement && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Detail Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Claim Info */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Claim Information</h3>
          <div className="space-y-3">
            {reimbursement.claimNumber && (
              <div>
                <p className="text-xs font-medium text-slate-400">Reference Number</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{reimbursement.claimNumber}</p>
              </div>
            )}
            {reimbursement.clinicName && (
              <div>
                <p className="text-xs font-medium text-slate-400">Clinic</p>
                <p className="mt-0.5 text-sm font-medium text-slate-900">{reimbursement.clinicName}</p>
              </div>
            )}
            {reimbursement.serviceDate && (
              <div>
                <p className="text-xs font-medium text-slate-400">Service Date</p>
                <p className="mt-0.5 text-sm text-slate-700">{reimbursement.serviceDate}</p>
              </div>
            )}

            {/* Amount — editable */}
            <div>
              <p className="text-xs font-medium text-slate-400">Amount</p>
              {editing ? (
                <input
                  type="number"
                  step="0.001"
                  value={editFields.amount}
                  onChange={(e) => setEditFields((f) => ({ ...f, amount: e.target.value }))}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              ) : (
                <p className="mt-0.5 text-2xl font-bold text-slate-900">{formatCurrency(reimbursement.amount)}</p>
              )}
            </div>

            {/* Description — editable */}
            <div>
              <p className="text-xs font-medium text-slate-400">Description</p>
              {editing ? (
                <textarea
                  value={editFields.description}
                  onChange={(e) => setEditFields((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              ) : (
                <p className="mt-0.5 text-sm text-slate-700">{reimbursement.description}</p>
              )}
            </div>

            {reimbursement.receiptUrl && (
              <div>
                <p className="text-xs font-medium text-slate-400">Receipt</p>
                <button type="button" onClick={() => setShowReceipt(!showReceipt)} className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                  {showReceipt ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showReceipt ? "Hide Receipt" : "View Receipt"}
                </button>
                {showReceipt && (
                  <div className="mt-3 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                    {reimbursement.receiptUrl?.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={`/api/reimbursements/${reimbursement.reimbursementId}/receipt`} className="w-full h-[500px] border-0" title="Receipt preview" />
                    ) : (
                      <img src={`/api/reimbursements/${reimbursement.reimbursementId}/receipt`} alt="Receipt" className="w-full h-auto max-h-[500px] object-contain" />
                    )}
                    <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-slate-200">
                      <span className="text-xs text-slate-400">Secure preview</span>
                      <a href={`/api/reimbursements/${reimbursement.reimbursementId}/receipt`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                        Open in new tab
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Timeline</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-400">Submitted</p>
              <p className="mt-0.5 text-sm text-slate-700">{formatDate(reimbursement.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Last Updated</p>
              <p className="mt-0.5 text-sm text-slate-700">{formatDate(reimbursement.updatedAt)}</p>
            </div>
          </div>

          {/* Edit form actions */}
          {editing && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Edit Claim</h4>
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1">Update Note (optional)</p>
                <textarea
                  value={editFields.notes}
                  onChange={(e) => setEditFields((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Add a note about this update..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={saveEdit} disabled={editSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50">
                  {editSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditing(false)} disabled={editSaving} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session & Contact Details */}
      {(reimbursement.sessionCount !== undefined || reimbursement.sessionTypes !== undefined ||
        reimbursement.sessionFor !== undefined || reimbursement.contactNumber !== undefined ||
        reimbursement.bankAccountNumber !== undefined) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">Session &amp; Contact Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {reimbursement.sessionCount !== undefined && (
              <div>
                <p className="text-xs font-medium text-slate-400">Number of Sessions</p>
                <p className="mt-0.5 text-sm font-medium text-slate-900">{reimbursement.sessionCount}</p>
              </div>
            )}
            {reimbursement.sessionTypes !== undefined && reimbursement.sessionTypes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-400">Session Types</p>
                <div className="mt-0.5 flex flex-wrap gap-1.5">
                  {reimbursement.sessionTypes.map((t) => (
                    <span key={t} className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {reimbursement.sessionFor !== undefined && (
              <div>
                <p className="text-xs font-medium text-slate-400">Session For</p>
                <p className="mt-0.5 text-sm font-medium text-slate-900 capitalize">
                  {reimbursement.sessionFor === "myself" ? "Myself" : reimbursement.sessionFor === "family_member" ? "Family member" : reimbursement.sessionForOther || reimbursement.sessionFor}
                </p>
              </div>
            )}
            {reimbursement.contactNumber && (
              <div>
                <p className="text-xs font-medium text-slate-400">Contact Number</p>
                <p className="mt-0.5 text-sm font-medium text-slate-900">{reimbursement.contactCountryCode ?? ""} {reimbursement.contactNumber}</p>
              </div>
            )}
            {reimbursement.bankAccountNumber && (
              <div>
                <p className="text-xs font-medium text-slate-400">Bank Account</p>
                <p className="mt-0.5 text-sm font-medium text-slate-900">{reimbursement.bankAccountNumber}</p>
              </div>
            )}
            {reimbursement.bankName && (
              <div>
                <p className="text-xs font-medium text-slate-400">Bank Name</p>
                <p className="mt-0.5 text-sm font-medium text-slate-900">{reimbursement.bankName}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Claim History */}
      {reimbursement.history && reimbursement.history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">Claim History</h3>
          <ol className="relative border-l border-slate-200 ml-2 space-y-4">
            {reimbursement.history.map((entry, i) => {
              const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.pending;
              return (
                <li key={i} className="pl-5 relative">
                  <span className={`absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white ${cfg.dot}`} />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-slate-400">{entry.actorRole === "employee" ? "Employee" : `Reviewer`}</span>
                    <span className="text-xs text-slate-400">&middot; {formatDate(entry.timestamp)}</span>
                  </div>
                  {entry.note && <p className="mt-1 text-xs text-slate-600">{entry.note}</p>}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Action Form */}
      {canAct && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            {reimbursement.status === "frozen" ? "Resolve Frozen Claim" : "Review Claim"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {reimbursement.status === "frozen" ? "This claim is frozen. You can approve or reject it." : "Review this claim and take action."}
          </p>

          <div className="mt-4">
            <label htmlFor="action-notes" className="block text-sm font-medium text-slate-700 mb-1">
              Notes <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-slate-400 ml-2">(required for rejection)</span>
            </label>
            <textarea
              id="action-notes" rows={3} value={notes}
              onChange={(e) => { setNotes(e.target.value); if (notesError) setNotesError(null); }}
              disabled={actionLoading !== null}
              placeholder="Add a note explaining this decision..."
              className={`w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-900 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${notesError ? "border-red-300 focus:ring-red-300" : "border-slate-200 focus:ring-teal-300"}`}
            />
            {notesError && <p className="mt-1 text-xs text-red-600">{notesError}</p>}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {availableActions.includes("approve") && (
              <button type="button" onClick={() => handleAction("approve")} disabled={actionLoading !== null} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                {actionLoading === "approve" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {reimbursement.status === "frozen" ? "Approve (Thaw)" : "Approve"}
              </button>
            )}
            {availableActions.includes("reject") && (
              <button type="button" onClick={() => handleAction("reject")} disabled={actionLoading !== null} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                {actionLoading === "reject" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                {reimbursement.status === "frozen" ? "Reject (Thaw)" : "Reject"}
              </button>
            )}
            {availableActions.includes("freeze") && (
              <button type="button" onClick={() => handleAction("freeze")} disabled={actionLoading !== null} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {actionLoading === "freeze" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Snowflake className="h-4 w-4" />}
                Freeze
              </button>
            )}
          </div>
        </div>
      )}

      {/* Edit hint for rejected claims */}
      {reimbursement.status === "rejected" && !editing && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <Edit3 className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">This claim has been rejected</p>
              <p className="mt-1 text-sm text-amber-700">
                You can still edit the claim details and submit an update. Click the <strong>Edit</strong> button next to the status badge to make changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Update Progress Modal */}
      {updateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setUpdateModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Send Update</h3>
              <button type="button" onClick={() => setUpdateModal(false)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              Send a progress update to the employee and clinic. This will appear in the claim history.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Message</label>
              <textarea
                value={updateMessage}
                onChange={(e) => setUpdateMessage(e.target.value)}
                rows={3}
                placeholder='e.g. "Currently with finance", "Almost done"...'
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                autoFocus
              />
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setUpdateModal(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={sendUpdate}
                disabled={updateSending || !updateMessage.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {updateSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
