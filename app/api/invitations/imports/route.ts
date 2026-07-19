import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { listImportHistory } from "@/src/server/services/invitationService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const campaigns = await listImportHistory(auth.context.tenant.tenantId);

    return NextResponse.json(campaigns, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
