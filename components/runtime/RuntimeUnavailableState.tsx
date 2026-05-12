"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { RuntimeContextError } from "@/runtime/context/RuntimeContext";
import type { RuntimeTenantResolutionSource } from "@/runtime/tenant/tenantResolution";
import { useTheme } from "@/runtime/theme/useTheme";

interface RuntimeUnavailableStateProps {
  error: RuntimeContextError | null;
  tenantSlug: string | null;
  tenantSource: RuntimeTenantResolutionSource | null;
}

function getUnavailableGuidance(
  error: RuntimeContextError | null,
  tenantSource: RuntimeTenantResolutionSource | null,
) {
  const failureReason =
    typeof error?.details?.failureReason === "string"
      ? error.details.failureReason
      : null;

  if (
    failureReason === "local_hostname_missing_tenant" ||
    failureReason === "root_domain_missing_subdomain" ||
    failureReason === "tenant_not_provided"
  ) {
    return "Open this runtime with a tenant subdomain or use the localhost tenant fallback for development.";
  }

  if (failureReason === "invalid_query_tenant") {
    return "The local tenant fallback is invalid. Check the tenant slug and try again.";
  }

  if (tenantSource === "query" || tenantSource === "stored") {
    return "The requested tenant runtime could not be loaded from the published configuration.";
  }

  return "The requested tenant runtime is not currently published or available.";
}

export default function RuntimeUnavailableState({
  error,
  tenantSlug,
  tenantSource,
}: RuntimeUnavailableStateProps) {
  const theme = useTheme();

  return (
    <div className="tenant-page-shell flex min-h-screen w-full items-center justify-center px-4 pt-24">
      <div
        className="w-full max-w-2xl rounded-[32px] border bg-white p-8 shadow-[0_32px_80px_-48px_rgba(15,23,42,0.35)] sm:p-10"
        style={{ borderColor: theme.borderAccent, background: theme.cardGradient }}
      >
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: theme.softAccent, color: theme.linkColor }}
        >
          <AlertCircle className="h-7 w-7" />
        </div>

        <div className="mt-6 space-y-3">
          <span className="tenant-chip inline-flex rounded-full px-4 py-1.5 text-sm font-medium">
            Runtime unavailable
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            This survey is currently unavailable.
          </h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">
            {getUnavailableGuidance(error, tenantSource)}
          </p>
          {tenantSlug ? (
            <p className="text-sm text-slate-500">
              Requested tenant: <span className="font-semibold text-slate-700">{tenantSlug}</span>
            </p>
          ) : null}
        </div>

        <div
          className="mt-6 rounded-2xl border px-4 py-4 text-sm text-slate-600"
          style={{ borderColor: theme.borderAccent, backgroundColor: theme.surfaceAccent }}
        >
          {error?.message ?? "The published runtime configuration could not be resolved for this request."}
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="tenant-button inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            Return to home
          </Link>
        </div>
      </div>
    </div>
  );
}
