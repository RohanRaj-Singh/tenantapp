import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { listPaymentQueue } from "@/src/server/services/paymentService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorizes payout-queue access.
 * Only Super Admin can view the payment queue — requires the `x-admin-api-key`
 * header matching ADMIN_API_KEY env var. The Super Admin dashboard proxy passes
 * this key for server-to-server calls.
 */
function authorizeRequest(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  return Boolean(apiKey && expectedKey && apiKey === expectedKey);
}

/**
 * GET /api/admin/payments
 *
 * Returns the payout queue (`to_be_paid` claims) grouped by clinic:
 * `{ groups: [{ clinicId, clinicName, totalAmount, count, claims: [{ reimbursementId, claimNumber, amount }] }], total }`.
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

    const result = await listPaymentQueue({ tenantId });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
