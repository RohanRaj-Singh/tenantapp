import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { getArLedger } from "@/src/server/services/invoiceService";
import { authorizeSuperAdmin } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/ledger
 *
 * Super-admin only. Returns the org-first Accounts Receivable ledger:
 * `{ organizations: [{ orgId, orgName, totalOutstanding, overdueAmount,
 * invoiceCount, lastInvoice*, lastPayment*, arStatus, aging }], total }`.
 *
 * Optional filters: `tenantId`, `status`, `daysOutstanding`, `search`.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeSuperAdmin(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const { searchParams } = new URL(request.url);
    const ledger = await getArLedger({
      tenantId: searchParams.get("tenantId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      daysOutstanding: searchParams.get("daysOutstanding") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    return NextResponse.json(ledger, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
