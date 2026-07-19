"use client";

import { useState, useEffect, useCallback } from "react";

// ── Generic fetch helper ─────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Response types mirroring API contracts ────────────────────────────────────

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingRegistration: number;
  inactiveEmployees: number;
}

export interface CampaignRecord {
  campaignId: string;
  tenantId: string;
  name: string;
  status: string;
  scheduledFor: string | null;
  totalRecipients: number;
  sentCount: number;
  openedCount: number;
  completedCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationRecord {
  invitationId: string;
  campaignId: string;
  tenantId: string;
  employeeId: string;
  email: string;
  employeeCode: string;
  token: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignListResult {
  campaigns: CampaignRecord[];
  total: number;
}

export interface InvitationListResult {
  invitations: InvitationRecord[];
  total: number;
}

// ── Hook result type ─────────────────────────────────────────────────────────

export interface UseAsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ── useOnboardingStats ───────────────────────────────────────────────────────
// Fetches GET /api/dashboard/onboarding-stats
// Returns aggregate counts for the stats overview cards.

export function useOnboardingStats(
  _tenantId: string,
): UseAsyncResult<DashboardStats> {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<DashboardStats>(
        "/api/dashboard/onboarding-stats",
      );
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard stats",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ── useCampaigns ─────────────────────────────────────────────────────────────
// Fetches GET /api/campaigns with optional search / status / pagination.

export function useCampaigns(
  _tenantId: string,
  options?: { search?: string; status?: string; skip?: number; limit?: number },
): UseAsyncResult<CampaignListResult> {
  const [data, setData] = useState<CampaignListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = options?.search;
  const status = options?.status;
  const skip = options?.skip;
  const limit = options?.limit;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (skip !== undefined && skip > 0)
        params.set("skip", String(skip));
      if (limit !== undefined) params.set("limit", String(limit));
      const qs = params.toString();
      const url = `/api/campaigns${qs ? `?${qs}` : ""}`;
      const result = await apiFetch<CampaignListResult>(url);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load campaigns",
      );
    } finally {
      setLoading(false);
    }
  }, [search, status, skip, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ── useInvitations ───────────────────────────────────────────────────────────
// Fetches GET /api/invitations with optional filters and pagination.

export function useInvitations(
  _tenantId: string,
  options?: {
    campaignId?: string;
    status?: string;
    search?: string;
    skip?: number;
    limit?: number;
  },
): UseAsyncResult<InvitationListResult> {
  const [data, setData] = useState<InvitationListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const campaignId = options?.campaignId;
  const status = options?.status;
  const search = options?.search;
  const skip = options?.skip;
  const limit = options?.limit;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (campaignId) params.set("campaignId", campaignId);
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      if (skip !== undefined && skip > 0)
        params.set("skip", String(skip));
      if (limit !== undefined) params.set("limit", String(limit));
      const qs = params.toString();
      const url = `/api/invitations${qs ? `?${qs}` : ""}`;
      const result = await apiFetch<InvitationListResult>(url);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load invitations",
      );
    } finally {
      setLoading(false);
    }
  }, [campaignId, status, search, skip, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ── useImportHistory ─────────────────────────────────────────────────────────
// Fetches GET /api/invitations/imports.
// Returns an array of CampaignDocument used as a proxy for import history.

export function useImportHistory(
  _tenantId: string,
): UseAsyncResult<CampaignRecord[]> {
  const [data, setData] = useState<CampaignRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<CampaignRecord[]>(
        "/api/invitations/imports",
      );
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load import history",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
