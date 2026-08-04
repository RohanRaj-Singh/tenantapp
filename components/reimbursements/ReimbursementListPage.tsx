"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  X,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Snowflake,
  Banknote,
  AlertCircle,
} from "lucide-react";

interface Reimbursement {
  reimbursementId: string;
  claimNumber?: string;
  employeeId: string;
  type: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  clinicId?: string;
  clinicName?: string;
  status: "pending" | "in_progress" | "approved" | "to_be_paid" | "rejected" | "frozen" | "paid";
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  reimbursements: Reimbursement[];
  total: number;
}

interface BudgetHistoryEntry {
  historyId: string;
  type: "created" | "topup" | "adjust" | "override";
  amount: number;
  beforeTotal: number;
  afterTotal: number;
  reason?: string;
  actorId: string;
  actorRole: string;
  createdAt: string;
}

const PAGE_SIZE = 20;

const BUDGET_HISTORY_CONFIG: Record<
  BudgetHistoryEntry["type"],
  { label: string; color: string }
> = {
  created: { label: "Created", color: "bg-emerald-100 text-emerald-700" },
  topup: { label: "Top Up", color: "bg-blue-100 text-blue-700" },
  adjust: { label: "Adjusted", color: "bg-amber-100 text-amber-700" },
  override: { label: "Override", color: "bg-red-100 text-red-700" },
};

function budgetHistoryTypeLabel(type: BudgetHistoryEntry["type"]) {
  return BUDGET_HISTORY_CONFIG[type]?.label ?? type;
}

function budgetHistoryTypeColor(type: BudgetHistoryEntry["type"]) {
  return BUDGET_HISTORY_CONFIG[type]?.color ?? "bg-slate-100 text-slate-600";
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  to_be_paid: { label: "To Be Paid", color: "bg-indigo-100 text-indigo-700", icon: Banknote },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  frozen: { label: "Frozen", color: "bg-sky-100 text-sky-700", icon: Snowflake },
  paid: { label: "Paid", color: "bg-purple-100 text-purple-700", icon: Banknote },
};

const UPDATE_TEMPLATES = ["Currently with finance", "Reached Remedy", "Almost done"];

function formatCurrency(amount: number) {
  return `OMR ${amount.toFixed(3)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysInStatus(claim: Reimbursement): { days: number; date: string; stale: boolean } {
  const now = Date.now();
  const ref = claim.updatedAt || claim.createdAt;
  const ms = now - new Date(ref).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return { days, date: ref, stale: days >= 7 };
}

export default function ReimbursementListPage() {
  const router = useRouter();
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "status">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const fetchReimbursements = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("skip", String(skip));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/reimbursements?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load claims.");

      const data: ListResponse = await res.json();

      // Client-side amount filtering (API doesn't support it yet)
      let filtered = data.reimbursements;
      if (amountMin) {
        const min = parseFloat(amountMin);
        if (!isNaN(min)) filtered = filtered.filter((r) => r.amount >= min);
      }
      if (amountMax) {
        const max = parseFloat(amountMax);
        if (!isNaN(max)) filtered = filtered.filter((r) => r.amount <= max);
      }

      setReimbursements(filtered);
      setTotal(filtered.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFrom, dateTo, sortBy, sortOrder, amountMin, amountMax, skip]);

  useEffect(() => {
    fetchReimbursements();
  }, [fetchReimbursements]);

  // Fetch budget
  useEffect(() => {
    async function loadBudget() {
      try {
        const res = await fetch("/api/budget");
        if (res.ok) setBudget(await res.json());
      } catch { /* ignore */ }
      setBudgetLoading(false);
    }
    loadBudget();
  }, []);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, search, dateFrom, dateTo, skip]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1;

  const goToPage = (page: number) => {
    setSkip((page - 1) * PAGE_SIZE);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setSkip(0);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setSkip(0);
  };

  const hasActiveFilters = search || statusFilter || dateFrom || dateTo || amountMin || amountMax;

  const allSelected = reimbursements.length > 0 && reimbursements.every((r) => selectedIds.has(r.reimbursementId));
  const someSelected = !allSelected && reimbursements.some((r) => selectedIds.has(r.reimbursementId));

  // Set indeterminate state on the select-all checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  // ── Reason Modal State ─────────────────────────────────────────────────────
  const [reasonModal, setReasonModal] = useState<{
    action: "reject" | "freeze";
  } | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // ── Send Update Modal State ────────────────────────────────────────────────
  const [updateModal, setUpdateModal] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateError, setUpdateError] = useState("");

  // ── Budget State ────────────────────────────────────────────────────────────
  const [budget, setBudget] = useState<{
    year: number;
    totalAmount: number;
    reservedAmount: number;
    committedAmount: number;
    paidAmount: number;
    availableAmount: number;
    budgetExceeded: boolean;
  } | null>(null);
  const [budgetHistory, setBudgetHistory] = useState<BudgetHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetAction, setBudgetAction] = useState<"set" | "topup">("set");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetReason, setBudgetReason] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);

  const fetchBudgetHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/budget/history");
      if (res.ok) {
        const data = await res.json();
        setBudgetHistory(Array.isArray(data.history) ? data.history : []);
      }
    } catch { /* ignore */ }
  }, []);

  async function executeBulkAction(
    action: "approve" | "reject" | "freeze" | "in_progress",
    notes?: string,
  ) {
    const ids = Array.from(selectedIds);
    setBulkProcessing(true);
    for (const id of ids) {
      try {
        await fetch(`/api/reimbursements/${id}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: notes ? JSON.stringify({ notes }) : undefined,
        });
      } catch {
        /* continue */
      }
    }
    setSelectedIds(new Set());
    setBulkProcessing(false);
    fetchReimbursements();
  }

  function openReasonModal(action: "reject" | "freeze") {
    setReasonModal({ action });
    setReasonText("");
    setReasonError("");
  }

  function handleReasonSubmit() {
    if (!reasonText.trim()) {
      setReasonError("Please provide a reason.");
      return;
    }
    const action = reasonModal!.action;
    const notes = reasonText.trim();
    setReasonModal(null);
    executeBulkAction(action, notes);
  }

  function openUpdateModal() {
    setUpdateMessage("");
    setUpdateError("");
    setUpdateModal(true);
  }

  async function sendUpdate() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!updateMessage.trim()) {
      setUpdateError("Message is required.");
      return;
    }

    setBulkProcessing(true);
    try {
      const res = await fetch("/api/reimbursements/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimIds: ids, message: updateMessage.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setUpdateError(body?.error ?? "Failed to send update.");
        return;
      }
      setUpdateModal(false);
      setUpdateMessage("");
      setUpdateError("");
      setSelectedIds(new Set());
      fetchReimbursements();
    } catch {
      setUpdateError("Failed to send update.");
    } finally {
      setBulkProcessing(false);
    }
  }

  // Derived summary stats from loaded data
  const summary = useMemo(() => {
    const stats = {
      total: total,
      pending: { count: 0, amount: 0 },
      in_progress: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      to_be_paid: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
      frozen: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
    };
    for (const r of reimbursements) {
      const s = r.status;
      if (stats[s as keyof typeof stats]) {
        (stats[s as keyof typeof stats] as { count: number; amount: number }).count++;
        (stats[s as keyof typeof stats] as { count: number; amount: number }).amount += r.amount;
      }
    }
    return stats;
  }, [reimbursements, total]);

  const statusTabs = [
    { key: "", label: "All", count: summary.total },
    { key: "pending", label: "Pending", count: summary.pending.count },
    { key: "in_progress", label: "In Progress", count: summary.in_progress.count },
    { key: "approved", label: "Approved", count: summary.approved.count },
    { key: "to_be_paid", label: "To Be Paid", count: summary.to_be_paid.count },
    { key: "rejected", label: "Rejected", count: summary.rejected.count },
    { key: "frozen", label: "Frozen", count: summary.frozen.count },
    { key: "paid", label: "Paid", count: summary.paid.count },
  ];

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Claims</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Claims Management</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition ${
              showFilters || hasActiveFilters
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                {(search ? 1 : 0) + (statusFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0) + (amountMin || amountMax ? 1 : 0)}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.push("/reimbursements/new")}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Claim
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Claims</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.total}</p>
          <p className="mt-0.5 text-xs text-slate-400">All claims</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{summary.pending.count}</p>
          <p className="mt-0.5 text-xs text-amber-600">{formatCurrency(summary.pending.amount)}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">In Progress</p>
          <p className="mt-1 text-2xl font-semibold text-blue-800">{summary.in_progress.count}</p>
          <p className="mt-0.5 text-xs text-blue-600">{formatCurrency(summary.in_progress.amount)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Approved</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">{summary.approved.count}</p>
          <p className="mt-0.5 text-xs text-emerald-600">{formatCurrency(summary.approved.amount)}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">To Be Paid</p>
          <p className="mt-1 text-2xl font-semibold text-indigo-800">{summary.to_be_paid.count}</p>
          <p className="mt-0.5 text-xs text-indigo-600">{formatCurrency(summary.to_be_paid.amount)}</p>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">Paid</p>
          <p className="mt-1 text-2xl font-semibold text-purple-800">{summary.paid.count}</p>
          <p className="mt-0.5 text-xs text-purple-600">{formatCurrency(summary.paid.amount)}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Rejected</p>
          <p className="mt-1 text-2xl font-semibold text-red-800">{summary.rejected.count}</p>
          <p className="mt-0.5 text-xs text-red-600">{formatCurrency(summary.rejected.amount)}</p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setStatusFilter(tab.key); setSkip(0); }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition ${
              statusFilter === tab.key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Budget Box */}
      {!budgetLoading && budget !== null && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {budget.budgetExceeded && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-600" />
              <p className="text-sm font-medium text-red-700">Budget exceeded — Contact Administrator</p>
            </div>
          )}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Budget {budget.year} (Annual)
            </p>
            <div className="flex gap-2">
              {budget.totalAmount === 0 ? (
                <button
                  type="button"
                  onClick={() => { setBudgetAction("set"); setBudgetAmount(""); setBudgetReason(""); setBudgetModal(true); }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Set Budget
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setBudgetAction("topup"); setBudgetAmount(""); setBudgetReason(""); setBudgetModal(true); }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Top Up
                  </button>
                  <button
                    type="button"
                    onClick={() => { fetchBudgetHistory(); setShowHistory(true); }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    History
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-400">Available</p>
              <p className="mt-0.5 text-lg font-semibold text-emerald-600">{formatCurrency(budget.availableAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Reserved</p>
              <p className="mt-0.5 text-lg font-semibold text-yellow-600">{formatCurrency(budget.reservedAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400"
                title="Committed = approved + queued + paid. Paid stays inside committed and does not free up Available again.">
                Committed
              </p>
              <p className="mt-0.5 text-lg font-semibold text-amber-600">{formatCurrency(budget.committedAmount)}</p>
              {budget.paidAmount > 0 && (
                <p className="text-xs text-slate-400">(Paid {formatCurrency(budget.paidAmount)})</p>
              )}
            </div>
          </div>
          {budget.totalAmount > 0 && (() => {
            // Paid lives inside committed, so the used portion is reserved + committed.
            const used = budget.reservedAmount + budget.committedAmount;
            const usedPct = Math.min(100, (used / budget.totalAmount) * 100);
            // Segments of the "used" portion: reserved (yellow) → committed (amber).
            const reservedEndPct = (budget.reservedAmount / Math.max(1, used)) * 100;
            return (
              <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${usedPct}%`,
                    background: `linear-gradient(90deg, #eab308 0%, #eab308 ${reservedEndPct}%, #f59e0b ${reservedEndPct}%, #f59e0b 100%)`,
                  }}
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* Budget Modal */}
      {budgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setBudgetModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {budgetAction === "set" ? "Set Budget" : "Top Up Budget"}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {budgetAction === "topup"
                ? `Add additional funds to the ${budget?.year ?? "annual"} budget.`
                : `Set the annual budget for ${budget?.year ?? new Date().getFullYear()}.`}
            </p>
            <input
              type="number"
              step="0.001"
              min="0"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder={budgetAction === "topup" ? "Additional amount..." : "Total budget amount..."}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
            {budgetAction === "topup" && (
              <textarea
                value={budgetReason}
                onChange={(e) => setBudgetReason(e.target.value)}
                placeholder="Reason (optional)..."
                rows={2}
                className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setBudgetModal(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Cancel</button>
              <button
                type="button"
                disabled={budgetSaving || !budgetAmount || parseFloat(budgetAmount) <= 0}
                onClick={async () => {
                  setBudgetSaving(true);
                  try {
                    const res = await fetch("/api/budget", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: budgetAction,
                        amount: parseFloat(budgetAmount),
                        year: budget?.year,
                        reason: budgetAction === "topup" ? budgetReason.trim() || undefined : undefined,
                      }),
                    });
                    if (res.ok) setBudget(await res.json());
                    setBudgetModal(false);
                    setBudgetReason("");
                    fetchBudgetHistory();
                  } catch { /* ignore */ }
                  setBudgetSaving(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {budgetSaving ? "Saving..." : budgetAction === "topup" ? "Add Funds" : "Save Budget"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget History Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowHistory(false)}>
          <div
            className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Budget History</h3>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {budgetHistory.length === 0 ? (
              <p className="text-sm text-slate-500">No budget activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {budgetHistory.map((entry) => (
                  <li key={entry.historyId} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${budgetHistoryTypeColor(entry.type)}`}>
                        {budgetHistoryTypeLabel(entry.type)}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {entry.type === "topup" ? "+" : ""}{formatCurrency(entry.amount)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(entry.createdAt)} · by {entry.actorId} ({entry.actorRole})
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatCurrency(entry.beforeTotal)} → {formatCurrency(entry.afterTotal)}
                    </p>
                    {entry.reason && (
                      <p className="mt-1 text-xs text-slate-600">Reason: {entry.reason}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Advanced Filters</p>
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Claim #, description..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Date From</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setSkip(0); }}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Date To</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setSkip(0); }}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Amount Range */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Amount Range</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <DollarSign className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    placeholder="Min"
                    value={amountMin}
                    onChange={(e) => { setAmountMin(e.target.value); setSkip(0); }}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-sm placeholder-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <span className="text-xs text-slate-400">—</span>
                <div className="relative flex-1">
                  <DollarSign className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    placeholder="Max"
                    value={amountMax}
                    onChange={(e) => { setAmountMax(e.target.value); setSkip(0); }}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-sm placeholder-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as "createdAt" | "updatedAt" | "status"); setSkip(0); }}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-3 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="createdAt">Created</option>
                <option value="updatedAt">Updated</option>
                <option value="status">Status</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value as "asc" | "desc"); setSkip(0); }}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-3 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-xs font-medium text-red-600 transition hover:text-red-700"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 -mx-1 rounded-xl bg-blue-600 px-5 py-3 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-white">
              {selectedIds.size} {selectedIds.size === 1 ? "claim" : "claims"} selected
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {reimbursements.length > 0 &&
                Array.from(selectedIds).every((id) => {
                  const r = reimbursements.find((r) => r.reimbursementId === id);
                  return r && r.status === "pending";
                }) && (
                  <button
                    type="button"
                    onClick={() => executeBulkAction("in_progress")}
                    disabled={bulkProcessing}
                    className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/30 disabled:opacity-50"
                  >
                    Mark In Progress
                  </button>
                )}
              {reimbursements.length > 0 &&
                Array.from(selectedIds).every((id) => {
                  const r = reimbursements.find((r) => r.reimbursementId === id);
                  return r && r.status === "in_progress";
                }) && (
                  <button
                    type="button"
                    onClick={() => executeBulkAction("approve")}
                    disabled={bulkProcessing}
                    className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/30 disabled:opacity-50"
                  >
                    Approve
                  </button>
                )}
              {reimbursements.length > 0 &&
                Array.from(selectedIds).every((id) => {
                  const r = reimbursements.find((r) => r.reimbursementId === id);
                  return r && (r.status === "pending" || r.status === "in_progress" || r.status === "frozen");
                }) && (
                  <button
                    type="button"
                    onClick={() => openReasonModal("reject")}
                    disabled={bulkProcessing}
                    className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/30 disabled:opacity-50"
                  >
                    Reject
                  </button>
                )}
              {reimbursements.length > 0 &&
                Array.from(selectedIds).every((id) => {
                  const r = reimbursements.find((r) => r.reimbursementId === id);
                  return r && (r.status === "in_progress" || r.status === "frozen");
                }) && (
                  <button
                    type="button"
                    onClick={() => openReasonModal("freeze")}
                    disabled={bulkProcessing}
                    className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/30 disabled:opacity-50"
                  >
                    Freeze
                  </button>
                )}
              <button
                type="button"
                onClick={openUpdateModal}
                disabled={bulkProcessing}
                className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/30 disabled:opacity-50"
              >
                Send Update
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="rounded-lg border border-white/40 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Failed to load claims</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchReimbursements}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-white p-8">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">Loading claims...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && reimbursements.length === 0 && (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-white p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <FileText className="h-6 w-6 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-slate-900">
              {hasActiveFilters ? "No matching claims" : "No claims yet"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {hasActiveFilters
                ? "Try adjusting your search or filter criteria."
                : "Create your first claim to get started."}
            </p>
          </div>
          {!hasActiveFilters && (
            <button
              type="button"
              onClick={() => router.push("/reimbursements/new")}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New Claim
            </button>
          )}
        </div>
      )}

      {/* Claims Table */}
      {!loading && !error && reimbursements.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="w-10 px-4 py-3">
                          <input
                            ref={selectAllRef}
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => {
                              if (allSelected) {
                                setSelectedIds(new Set());
                              } else {
                                setSelectedIds(new Set(reimbursements.map((r) => r.reimbursementId)));
                              }
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Claim #</th>
                    <th className="hidden px-4 py-3 font-semibold text-slate-600 sm:table-cell">Clinic</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Amount</th>
                    <th className="hidden px-4 py-3 font-semibold text-slate-600 md:table-cell">Description</th>
                    <th className="hidden px-4 py-3 font-semibold text-slate-600 lg:table-cell">Date</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {reimbursements.map((r) => {
                    const sc = STATUS_CONFIG[r.status] ?? { label: r.status, color: "bg-slate-100 text-slate-500", icon: Clock };
                    return (
                      <tr
                        key={r.reimbursementId}
                        onClick={() => router.push(`/reimbursements/${r.reimbursementId}`)}
                        className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.reimbursementId)}
                            onChange={() => {
                              const next = new Set(selectedIds);
                              if (next.has(r.reimbursementId)) {
                                next.delete(r.reimbursementId);
                              } else {
                                next.add(r.reimbursementId);
                              }
                              setSelectedIds(next);
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {r.claimNumber ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="hidden max-w-[140px] truncate px-4 py-3 text-slate-600 sm:table-cell">
                          {r.clinicName || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {formatCurrency(r.amount)}
                        </td>
                        <td className="hidden max-w-[200px] truncate px-4 py-3 text-slate-500 md:table-cell">
                          {r.description}
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-slate-500 lg:table-cell">
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(() => {
                            const { days, stale } = daysInStatus(r);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-medium ${
                                  stale ? "text-red-600" : "text-slate-400"
                                }`}
                              >
                                {stale && <AlertCircle className="h-3 w-3" />}
                                {days}d
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-slate-500">
              Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total} claims
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pageNumbers.map((page, i) =>
                page === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">...</span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => goToPage(page as number)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Reason Modal */}
      {reasonModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setReasonModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {reasonModal.action === "reject" ? "Reject Claims" : "Freeze Claims"}
              </h3>
              <button
                type="button"
                onClick={() => setReasonModal(null)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-1 text-sm text-slate-500">
              {reasonModal.action === "reject"
                ? "Provide a reason for rejecting these claims. The employee and clinic will be notified."
                : "Provide a reason for freezing these claims. More information may be needed from the employee or clinic."}
            </p>

            <p className="mb-4 text-xs font-medium text-slate-400">
              {selectedIds.size} claim{selectedIds.size !== 1 ? "s" : ""} selected
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <p className="text-xs text-amber-700">
                  This reason will be visible to the employee and clinic. Please provide a clear explanation.
                </p>
              </div>

              <textarea
                value={reasonText}
                onChange={(e) => {
                  setReasonText(e.target.value);
                  if (e.target.value.trim()) setReasonError("");
                }}
                placeholder={`Enter reason for ${reasonModal.action === "reject" ? "rejection" : "freezing"}...`}
                rows={4}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  reasonError ? "border-red-300" : "border-slate-200 focus:border-blue-300"
                }`}
                autoFocus
              />
              {reasonError && (
                <p className="text-xs text-red-600">{reasonError}</p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReasonModal(null)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReasonSubmit}
                className={`rounded-xl px-5 py-2.5 text-sm font-medium text-white transition ${
                  reasonModal.action === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {reasonModal.action === "reject" ? "Reject Claims" : "Freeze Claims"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Update Modal */}
      {updateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setUpdateModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Send Update</h3>
              <button
                type="button"
                onClick={() => setUpdateModal(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-1 text-sm text-slate-500">
              Send a progress update to the selected claims. The employee will be notified.
            </p>

            <p className="mb-4 text-xs font-medium text-slate-400">
              {selectedIds.size} claim{selectedIds.size !== 1 ? "s" : ""} selected
            </p>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {UPDATE_TEMPLATES.map((template) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => {
                      setUpdateMessage(template);
                      setUpdateError("");
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      updateMessage === template
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {template}
                  </button>
                ))}
              </div>

              <textarea
                value={updateMessage}
                onChange={(e) => {
                  setUpdateMessage(e.target.value);
                  if (e.target.value.trim()) setUpdateError("");
                }}
                placeholder="Enter the update message... e.g. Currently with finance"
                rows={4}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  updateError ? "border-red-300" : "border-slate-200 focus:border-blue-300"
                }`}
                autoFocus
              />
              {updateError && (
                <p className="text-xs text-red-600">{updateError}</p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setUpdateModal(false)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendUpdate}
                disabled={bulkProcessing}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {bulkProcessing ? "Sending..." : "Send Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
