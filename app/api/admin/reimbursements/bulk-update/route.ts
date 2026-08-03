import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { bulkPostProgressUpdate } from "@/src/server/services/reimbursementService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorizes a Super Admin bulk progress update.
 * Only Super Admin can run this across tenants — requires the `x-admin-api-key`
 * header matching ADMIN_API_KEY env var. The Super Admin dashboard proxy passes
 * this key for server-to-server calls.
 */
function authorizeRequest(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  return Boolean(apiKey && expectedKey && apiKey === expectedKey);
}

/**
 * POST /api/admin/reimbursements/bulk-update
 *
 * Super Admin variant of the tenant bulk-update. Body:
 * `{ tenantId: string, claimIds: string[], message: string }`.
 * Posts the same progress update to every selected claim that belongs to the
 * supplied tenant (cross-tenant claims in the batch are skipped). Returns
 * `{ updated, skipped }`. The actor is recorded as `"super-admin"`.
 */
export async function POST(request: NextRequest) {
  if (!authorizeRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Super Admin access required." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const tenantId = typeof body.tenantId === "string" && body.tenantId.trim() !== "" ? body.tenantId.trim() : "";
    const claimIds = Array.isArray(body.claimIds)
      ? body.claimIds.filter((id: unknown): id is string => typeof id === "string" && id.trim() !== "")
      : [];
    const message = typeof body.message === "string" ? body.message : "";

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant is required.", errorCode: "TENANT_REQUIRED" },
        { status: 400 },
      );
    }
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

    const result = await bulkPostProgressUpdate(tenantId, claimIds, message.trim(), "super-admin");

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
