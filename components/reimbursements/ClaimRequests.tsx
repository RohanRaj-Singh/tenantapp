"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HelpCircle,
  Loader2,
  Send,
  Check,
  X,
  Info,
  RefreshCw,
  MessageSquareText,
} from "lucide-react";

interface RequestParticipant {
  role: string;
  id: string;
  name: string;
}

interface ClaimRequest {
  requestId: string;
  status: "pending" | "approved" | "rejected" | "more_info" | "converted_to_chat";
  subject: string;
  body: string;
  requester: RequestParticipant;
  responder?: RequestParticipant;
  resolutionNote?: string;
  createdAt: string;
}

interface ClaimRequestsProps {
  claimId: string;
  /** Base URL for the claim's requests, e.g. `/api/reimbursements/{id}/requests`. */
  apiBase: string;
  /** Whether the caller can respond (tenant admin → true; super admin → false). */
  canDecide?: boolean;
  /** Whether the caller can create a new request (employee/clinic → true; admin → false). */
  canCreate?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending: { label: "Pending", class: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", class: "bg-red-50 text-red-700 border-red-200" },
  more_info: { label: "Needs more info", class: "bg-sky-50 text-sky-700 border-sky-200" },
  converted_to_chat: { label: "Moved to chat", class: "bg-violet-50 text-violet-700 border-violet-200" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Errors come as `{ error: string }` or `{ error: { message } }`; always render a string. */
function errorText(data: { error?: unknown } | null, fallback: string): string {
  if (!data) return fallback;
  const e = data.error;
  if (typeof e === "string" && e.trim()) return e;
  if (e && typeof e === "object") {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

export default function ClaimRequests({
  claimId,
  apiBase,
  canDecide = false,
  canCreate = false,
}: ClaimRequestsProps) {
  const [requests, setRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(apiBase);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests ?? []);
      } else {
        const data = await res.json().catch(() => null);
        setError(errorText(data, "Failed to load requests."));
      }
    } catch {
      setError("Failed to load requests.");
    }
    setLoading(false);
  }, [apiBase]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!subject.trim() || !body.trim()) {
        setError("Please provide a subject and a description.");
        return;
      }
      setSending(true);
      setError("");
      try {
        const res = await fetch(apiBase, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(errorText(data, "Failed to send request."));
        setSubject("");
        setBody("");
        await fetchRequests();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send request.");
      } finally {
        setSending(false);
      }
    },
    [subject, body, apiBase, fetchRequests],
  );

  const decide = useCallback(
    async (requestId: string, decision: string) => {
      setDeciding(requestId);
      setError("");
      try {
        const res = await fetch(`${apiBase}/${requestId}/decide`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, notes: note.trim() || undefined }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(errorText(data, "Failed to respond to request."));
        }
        setNote("");
        setOpenId(null);
        await fetchRequests();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to respond to request.");
      } finally {
        setDeciding(null);
      }
    },
    [apiBase, note, fetchRequests],
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-amber-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-100 bg-amber-50/50">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <HelpCircle className="w-4.5 h-4.5 text-amber-700" />
        </div>
        <div className="min-w-0">
          <p className="font-satoshi text-[10px] font-bold uppercase tracking-widest text-amber-700/70">
            {canDecide ? "Answer the employee" : "Ask the organization"}
          </p>
          <p className="font-satoshi font-bold text-sm text-slate-800 leading-tight">
            Requests
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {pendingCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-600 font-satoshi font-bold text-[11px] text-white">
              {pendingCount} pending
            </span>
          )}
          <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-amber-200 bg-white font-satoshi font-bold text-[11px] text-amber-700">
            {loading ? "…" : `${requests.length}`}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="px-4 pt-3">
          <p className="font-satoshi text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[100px]">
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-amber-700" />
          </div>
        )}

        {!loading && requests.length === 0 && (
          <div className="text-center py-5 px-2">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
              <MessageSquareText className="w-5 h-5 text-amber-600" />
            </div>
            <p className="font-satoshi font-bold text-sm text-slate-700">
              No requests yet
            </p>
            <p className="font-satoshi text-xs text-slate-400 mt-1">
              Employees can ask whether something is possible before filing a claim.
            </p>
          </div>
        )}

        {requests.map((req) => {
          const cfg = STATUS_CONFIG[req.status] ?? {
            label: req.status,
            class: "bg-gray-50 text-gray-600 border-gray-200",
          };
          const isPending = req.status === "pending";
          return (
            <div
              key={req.requestId}
              className={`rounded-lg border p-3 space-y-2 ${
                isPending ? "border-amber-200 bg-amber-50/40" : "border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-satoshi font-bold text-sm text-slate-800">{req.subject}</p>
                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full border font-satoshi font-bold text-[11px] ${cfg.class}`}>
                  {cfg.label}
                </span>
              </div>
              <p className="font-satoshi text-xs text-slate-600 whitespace-pre-wrap">{req.body}</p>
              <p className="font-satoshi text-[11px] text-slate-400">
                {req.requester.name} &middot; {formatTime(req.createdAt)}
              </p>

              {req.resolutionNote && (
                <p className="font-satoshi text-xs text-slate-600 bg-white rounded-md px-2 py-1.5">
                  <span className="font-bold text-slate-700">Reply:</span> {req.resolutionNote}
                </p>
              )}

              {/* Pending + can decide → show action buttons */}
              {canDecide && isPending && (
                <div className="pt-1 space-y-2">
                  {openId === req.requestId ? (
                    <>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="Optional note to the requester (required to reject)"
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 font-satoshi text-xs text-slate-800 placeholder-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={deciding === req.requestId}
                          onClick={() => decide(req.requestId, "approved")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={deciding === req.requestId}
                          onClick={() => decide(req.requestId, "rejected")}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          type="button"
                          disabled={deciding === req.requestId}
                          onClick={() => decide(req.requestId, "more_info")}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50"
                        >
                          <Info className="w-3.5 h-3.5" /> Ask for info
                        </button>
                        <button
                          type="button"
                          disabled={deciding === req.requestId}
                          onClick={() => decide(req.requestId, "converted_to_chat")}
                          className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Move to chat
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenId(openId === req.requestId ? null : req.requestId);
                        setNote("");
                      }}
                      className="font-satoshi text-xs font-bold text-amber-700 underline decoration-amber-300 underline-offset-2 hover:no-underline"
                    >
                      Respond to this request
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create composer — employees and clinics */}
      {canCreate && (
        <form onSubmit={submit} className="border-t border-amber-100 bg-amber-50/30 px-4 py-3 space-y-2">
          <p className="font-satoshi text-[11px] font-semibold text-amber-800">
            Check before you claim
          </p>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject — e.g. Is an expensive assessment covered?"
            disabled={sending}
            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 font-satoshi text-sm text-slate-800 placeholder-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Ask the organization whether something is possible…"
            disabled={sending}
            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 font-satoshi text-sm text-slate-800 placeholder-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
          />
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 font-satoshi text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send Request
          </button>
        </form>
      )}
    </div>
  );
}