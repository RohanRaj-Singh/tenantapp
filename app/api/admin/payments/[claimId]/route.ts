import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { getPaymentDetail } from "@/src/server/services/paymentService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorizes payment-detail access.
 * Super Admin only — requires the `x-admin-api-key` header matching ADMIN_API_KEY.
 */
function authorizeRequest(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  return Boolean(apiKey && expectedKey && apiKey === expectedKey);
}

/**
 * GET /api/admin/payments/:claimId
 *
 * Returns the PaymentRecord for a claim plus the full claim snapshot (clinic,
 * employee, bank, sessions, service date) and the funding invoice number.
 * `{ paymentRecord, claim, invoiceNumber, tenantName }`.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ claimId: string }> },
) {
  if (!authorizeRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Super Admin access required." },
      { status: 401 },
    );
  }

  try {
    const { claimId } = await context.params;
    const detail = await getPaymentDetail(claimId);

    if (!detail.paymentRecord) {
      return NextResponse.json(
        { error: "Payment record not found for this claim." },
        { status: 404 },
      );
    }

    return NextResponse.json(detail, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
