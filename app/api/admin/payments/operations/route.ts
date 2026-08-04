import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { listPaymentOperations } from "@/src/server/services/paymentService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorizes payout-workspace access.
 * Super Admin only — requires the `x-admin-api-key` header matching ADMIN_API_KEY.
 */
function authorizeRequest(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  return Boolean(apiKey && expectedKey && apiKey === expectedKey);
}

/**
 * GET /api/admin/payments/operations
 *
 * Returns the org-first Payment Operations workspace:
 * `{ summary, organizations: [{ tenantId, tenantName, totalOutstanding,
 * lastPaymentDate, clinics: [{ clinicId, clinicName, totalAmount, count,
 * claims }] }], paymentHistory }`.
 *
 * Optional `tenantId` filter is forwarded.
 */
export async function GET(request: NextRequest) {
  if (!authorizeRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Super Admin access required." },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") ?? undefined;

    const result = await listPaymentOperations({ tenantId });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
