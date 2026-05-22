"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Loader2, LockKeyhole, UserRound } from "lucide-react";
import {
  appendTenantSlugToPath,
  getSafeTenantRedirectPath,
} from "../guards/route-protection";
import { RUNTIME_TENANT_QUERY_PARAM } from "@/runtime/tenant/tenantResolution";

interface TenantLoginPageProps {
  tenantName?: string | null;
  tenantSlug?: string | null;
  message?: string | null;
  nextPath?: string | null;
}

export function TenantLoginPage({
  tenantName,
  tenantSlug,
  message,
  nextPath,
}: TenantLoginPageProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(message ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeNextPath = useMemo(
    () => appendTenantSlugToPath(getSafeTenantRedirectPath(nextPath), tenantSlug),
    [nextPath, tenantSlug],
  );
  const canSubmit = Boolean(tenantSlug);
  const loginApiPath = useMemo(() => {
    if (!tenantSlug) {
      return "/api/tenant-auth/login";
    }

    const params = new URLSearchParams({
      [RUNTIME_TENANT_QUERY_PARAM]: tenantSlug,
    });
    return `/api/tenant-auth/login?${params.toString()}`;
  }, [tenantSlug]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError("Email or username is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (!canSubmit) {
      setError("Tenant dashboard access is unavailable.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(loginApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier, password, next: safeNextPath }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(payload?.error ?? "Unable to sign in.");
        return;
      }

      window.location.assign(payload.redirectTo ?? safeNextPath);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to sign in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background: "var(--tenant-page-gradient, #f8fafc)",
        fontFamily: "var(--tenant-font-family, Inter, system-ui, sans-serif)",
      }}
    >
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-black/[0.06] bg-white p-10 shadow-2xl shadow-black/[0.04]">
          {/* Brand header */}
          <div className="text-center">
            <div
              className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                backgroundColor: "var(--tenant-primary-soft, rgba(245,130,32,0.12))",
              }}
            >
              <LockKeyhole
                className="h-5 w-5"
                style={{ color: "var(--tenant-primary, #f58220)" }}
              />
            </div>
            <h1
              className="text-2xl font-semibold"
              style={{ color: "var(--tenant-primary, #f58220)" }}
            >
              {tenantName ?? "Sign in"}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Enter your credentials to access the dashboard.
            </p>
          </div>

          {/* Missing tenant slug warning */}
          {!tenantSlug && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              A tenant workspace could not be resolved. Use your tenant
              subdomain or include a <code className="font-mono">tenant</code>{" "}
              query parameter.
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="identifier"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Email or username
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <UserRound className="h-4 w-4" />
                </span>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={isSubmitting || !canSubmit}
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--tenant-primary,#f58220)] focus:ring-2 focus:ring-[var(--tenant-primary-soft,rgba(245,130,32,0.12))] disabled:cursor-not-allowed disabled:bg-slate-50"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <LockKeyhole className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting || !canSubmit}
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--tenant-primary,#f58220)] focus:ring-2 focus:ring-[var(--tenant-primary-soft,rgba(245,130,32,0.12))] disabled:cursor-not-allowed disabled:bg-slate-50"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: "var(--tenant-primary, #f58220)",
              }}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Need help? Contact your administrator.
        </p>
      </div>
    </div>
  );
}
