import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { resolveRuntimeTenantRequestFromRequest } from "@/src/server/runtime/requestTenantResolution";
import { loadRuntimeConfigForRequest } from "@/src/server/services/runtimeConfigService";

export async function GET(request: Request) {
  try {
    const requestTenant = resolveRuntimeTenantRequestFromRequest(request);
    const runtimeConfig = await loadRuntimeConfigForRequest(requestTenant);
    return NextResponse.json(runtimeConfig, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
