import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { listInvitations } from "@/src/server/services/invitationService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);

    const result = await listInvitations(auth.context.tenant.tenantId, {
      campaignId: url.searchParams.get("campaignId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      employeeId: url.searchParams.get("employeeId") ?? undefined,
      skip: parseInt(url.searchParams.get("skip") ?? "0", 10),
      limit: parseInt(url.searchParams.get("limit") ?? "50", 10),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
