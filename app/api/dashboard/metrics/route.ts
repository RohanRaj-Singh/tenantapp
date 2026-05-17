import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { loadDashboardMetrics } from "@/src/server/services/dashboardMetricsService";

export async function GET(request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);

    const response = await loadDashboardMetrics({
      tenantSlug: auth.context.tenant.slug,
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
