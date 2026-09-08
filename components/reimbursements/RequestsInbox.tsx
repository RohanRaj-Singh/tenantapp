"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  HelpCircle,
  RefreshCw,
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ChevronRight,
} from "lucide-react";

type ClaimRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "more_info"
  | "converted_to_chat";

interface ClaimRequester {
  role: "employee" | "clinic" | "tenantAdmin" | "superAdmin";
  id: string;
  name: string;
  key: string;
}

interface ClaimRequest {
  requestId: string;
  tenantId: string;
  claimId: string;
  claimNumber: string;
  subject: string;
  body: string;
  status: ClaimRequestStatus;
  requester: ClaimRequester;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  requests: ClaimRequest[];
}

const STATUS_CONFIG: Record<
  ClaimRequestStatus,
  {
    label: string;
    badge: string;
    Icon: typeof Clock;
  }
> = {
  pending: {
    label: "Pending",
    badge: "bg-amber-100 text-amber-800",
    Icon: Clock,
  },
  approved: {
    label: "Approved",
    badge: "bg-emerald-100 text-emerald-800",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-100 text-red-800",
    Icon: XCircle,
  },
  more_info: {
    label: "Needs more info",
    badge: "bg-blue-100 text-blue-800",
    Icon: HelpCircle,
  },
  converted_to_chat: {
    label: "Moved to chat",
    badge: "bg-violet-100 text-violet-800",
    Icon: MessageSquare,
  },
};

const STATUS_FILTERS: { value: ClaimRequestStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "more_info", label: "Needs info" },
  { value: "converted_to_chat", label: "In chat" },
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RequestsInbox() {
  const [requests, setRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ClaimRequestStatus | "all">(
    "pending",
  );

  const fetchRequests = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      setError(null);
      try {
        const url =
          statusFilter === "all"
            ? "/api/requests"
            : `/api/requests?status=${encodeURIComponent(statusFilter)}`;
        const res = await fetch(url, {
          method: "GET",
          cache: "no-store",
          signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ??
              `Failed to load requests (${res.status})`,
          );
        }
        const data = (await res.json()) as ListResponse;
        setRequests(Array.isArray(data.requests) ? data.requests : []);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Unable to load requests.",
        );
        setRequests([]);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    setLoading(true);
    const ctrl = new AbortController();
    void fetchRequests(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchRequests]);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pending questions from employees and clinics before they file a
            claim. Responding here does not change a claim, invoice, or
            payment — it only updates this Request.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchRequests()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:opacity-50"
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh
        </button>
      </header>

      <div
        className="flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Filter requests by status"
      >
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-300 ${
                active
                  ? "bg-teal-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p className="font-medium">Could not load requests</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={() => fetchRequests()}
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
          >
            Try again
          </button>
        </div>
      )}

      {!error && loading && requests.length === 0 ? (
        <RequestsSkeleton />
      ) : !error && !loading && requests.length === 0 ? (
        <EmptyState filter={statusFilter} />
      ) : (
        <ul className="space-y-3" aria-label="Requests list">
          {requests.map((r) => (
            <li key={r.requestId}>
              <RequestRow request={r} pending={pendingCount} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestRow({
  request,
  pending,
}: {
  request: ClaimRequest;
  pending: number;
}) {
  const cfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;
  const { Icon } = cfg;
  const preview =
    request.body.length > 220
      ? `${request.body.slice(0, 220).trimEnd()}…`
      : request.body;
  return (
    <Link
      href={`/reimbursements/${request.claimId}#claim-requests`}
      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {cfg.label}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {request.claimNumber}
            </span>
          </div>
          <h2 className="mt-2 text-sm font-semibold text-slate-900">
            {request.subject}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{preview}</p>
        </div>
        <ChevronRight
          className="h-5 w-5 flex-none text-slate-300 transition group-hover:text-teal-500"
          aria-hidden="true"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>
          From{" "}
          <span className="font-medium text-slate-700">
            {request.requester.name}
          </span>
          <span className="ml-1 text-slate-400">
            ({roleLabel(request.requester.role)})
          </span>
        </span>
        <span aria-hidden="true">·</span>
        <span>{formatDateTime(request.createdAt)}</span>
        {request.status === "pending" && pending > 1 && (
          <span aria-hidden="true">·</span>
        )}
        {request.status === "pending" && pending > 1 && (
          <span className="text-slate-400">
            {pending} pending across this view
          </span>
        )}
      </div>
    </Link>
  );
}

function roleLabel(role: ClaimRequester["role"]): string {
  switch (role) {
    case "employee":
      return "Employee";
    case "clinic":
      return "Clinic";
    case "tenantAdmin":
      return "Organization";
    case "superAdmin":
      return "Super admin";
    default:
      return role;
  }
}

function EmptyState({
  filter,
}: {
  filter: ClaimRequestStatus | "all";
}) {
  const copy =
    filter === "pending"
      ? "No pending requests. The organization inbox is clear."
      : filter === "all"
        ? "No requests yet. Employees and clinics can ask questions before filing a claim."
        : "No requests match this filter.";
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <Inbox className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-slate-700">
        Nothing here.
      </p>
      <p className="mt-1 text-sm text-slate-500">{copy}</p>
    </div>
  );
}

function RequestsSkeleton() {
  return (
    <ul className="space-y-3" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 animate-pulse rounded-full bg-slate-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-3 w-40 animate-pulse rounded bg-slate-100" />
        </li>
      ))}
    </ul>
  );
}
