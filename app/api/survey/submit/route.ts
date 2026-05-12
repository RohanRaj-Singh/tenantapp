import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { resolveRuntimeTenantRequestFromRequest } from "@/src/server/runtime/requestTenantResolution";
import { submitSurveyResponse } from "@/src/server/services/responseSubmissionService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const requestTenant = resolveRuntimeTenantRequestFromRequest(request);
    const response = await submitSurveyResponse(body, { requestTenant });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
