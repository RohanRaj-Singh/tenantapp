import { NextResponse } from "next/server";
import { sanitizeTenantSlug } from "@/runtime/tenant/tenantResolution";
import { ApiError } from "@/src/server/api/errors";
import { apiErrorResponse } from "@/src/server/api/responses";
import { resolveRuntimeTenantRequestFromRequest } from "@/src/server/runtime/requestTenantResolution";
import { loadRuntimeConfig } from "@/src/server/services/runtimeConfigService";

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const { tenantSlug } = await context.params;
    const requestedTenantSlug = sanitizeTenantSlug(tenantSlug);

    if (!requestedTenantSlug) {
      throw new ApiError(
        404,
        "TENANT_NOT_FOUND",
        "This survey is currently unavailable.",
      );
    }

    const requestTenant = resolveRuntimeTenantRequestFromRequest(request);

    if (
      requestTenant.source === "hostname" &&
      requestTenant.tenantSlug &&
      requestTenant.tenantSlug !== requestedTenantSlug
    ) {
      throw new ApiError(
        409,
        "TENANT_ROUTE_MISMATCH",
        "The requested tenant does not match the current hostname.",
        {
          hostnameTenantSlug: requestTenant.tenantSlug,
          routeTenantSlug: requestedTenantSlug,
        },
      );
    }

    const runtimeConfig = await loadRuntimeConfig(
      requestTenant.tenantSlug ?? requestedTenantSlug,
    );
    return NextResponse.json(runtimeConfig, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
