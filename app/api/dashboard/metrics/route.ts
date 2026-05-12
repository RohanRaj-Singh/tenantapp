import { NextResponse } from "next/server";
import { ApiError } from "@/src/server/api/errors";
import { apiErrorResponse } from "@/src/server/api/responses";
import { resolveRuntimeTenantRequestFromRequest } from "@/src/server/runtime/requestTenantResolution";
import { loadDashboardMetrics } from "@/src/server/services/dashboardMetricsService";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestTenant = resolveRuntimeTenantRequestFromRequest(request);

    if (!requestTenant.tenantSlug) {
      throw new ApiError(
        404,
        "TENANT_RESOLUTION_REQUIRED",
        "This survey is currently unavailable.",
        {
          hostname: requestTenant.hostname,
          rootDomain: requestTenant.rootDomain,
          failureReason: requestTenant.failureReason,
        },
      );
    }

    const response = await loadDashboardMetrics({
      tenantSlug: requestTenant.tenantSlug,
      scannerVersionId: url.searchParams.get("scannerVersionId") ?? undefined,
      calculationVersionId: url.searchParams.get("calculationVersionId") ?? undefined,
      periodFrom: url.searchParams.get("periodFrom") ?? undefined,
      periodTo: url.searchParams.get("periodTo") ?? undefined,
      filters: {
        stream: url.searchParams.get("stream") ?? undefined,
        location: url.searchParams.get("location") ?? undefined,
        function: url.searchParams.get("function") ?? undefined,
        department: url.searchParams.get("department") ?? undefined,
        gender: url.searchParams.get("gender") ?? undefined,
        age: url.searchParams.get("age") ?? undefined,
        seniority: url.searchParams.get("seniority") ?? undefined,
      },
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
