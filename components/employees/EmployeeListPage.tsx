"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

interface Employee {
  employeeId: string;
  employeeCode: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  employees: Employee[];
  total: number;
}

const PAGE_SIZE = 20;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EmployeeListPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      params.set("skip", String(skip));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/employees?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load employees.");
      }

      const data: ListResponse = await res.json();
      setEmployees(data.employees);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, skip]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1;

  const goToPage = (page: number) => {
    setSkip((page - 1) * PAGE_SIZE);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setSkip(0);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setSkip(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">
            Employees
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            Employee Management
          </h2>
        </div>
        <button
          type="button"
          onClick={() => router.push("/employees/new")}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Employee
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or employee ID..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-40"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Failed to load employees</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchEmployees}
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
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-white p-8">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">Loading employees...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && employees.length === 0 && (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-white p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Search className="h-6 w-6 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-slate-900">
              {search || statusFilter ? "No matching employees" : "No employees yet"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {search || statusFilter
                ? "Try adjusting your search or filter criteria."
                : "Add your first employee to get started."}
            </p>
          </div>
          {!search && !statusFilter && (
            <button
              type="button"
              onClick={() => router.push("/employees/new")}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New Employee
            </button>
          )}
        </div>
      )}

      {/* Employee List */}
      {!loading && !error && employees.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">Employee ID</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
                  <th className="hidden px-4 py-3 font-semibold text-slate-600 sm:table-cell">
                    Email
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="hidden px-4 py-3 font-semibold text-slate-600 md:table-cell">
                    Last Access
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr
                    key={employee.employeeId}
                    onClick={() => router.push(`/employees/${employee.employeeId}`)}
                    className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {employee.employeeCode}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{employee.name}</td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                      {employee.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          employee.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {employee.status}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      {employee.lastAccessAt
                        ? formatDate(employee.lastAccessAt)
                        : <span className="text-slate-400">Never</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total} employees
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="px-2 text-sm text-slate-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
