import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { bulkPostProgressUpdate } from "@/src/server/services/reimbursementService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/reimbursements/bulk-update
 *
 * Tenant-authenticated. Body: `{ claimIds: string[], message: string }`.
 * Posts the same progress update to every selected claim that belongs to the
 * caller's tenant. Returns `{ updated, skipped }`.
 */
export async function POST(request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const claimIds = Array.isArray(body.claimIds)
      ? body.claimIds.filter((id: unknown): id is string => typeof id === "string" && id.trim() !== "")
      : [];
    const message = typeof body.message === "string" ? body.message : "";

    if (!message.trim()) {
      return NextResponse.json(
        { error: "Message is required.", errorCode: "MESSAGE_REQUIRED" },
        { status: 400 },
      );
    }
    if (claimIds.length === 0) {
      return NextResponse.json(
        { error: "At least one claim must be selected.", errorCode: "CLAIMS_REQUIRED" },
        { status: 400 },
      );
    }

    const result = await bulkPostProgressUpdate(
      auth.context.tenant.tenantId,
      claimIds,
      message.trim(),
      auth.context.user.id,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
