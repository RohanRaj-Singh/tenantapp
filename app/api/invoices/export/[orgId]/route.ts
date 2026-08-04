import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { exportOrgInvoicesCsv } from "@/src/server/services/invoiceService";
import { authorizeSuperAdmin } from "../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/export/:orgId
 *
 * Super-admin only. Streams one organization's invoice ledger as a CSV download.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> },
) {
  const auth = await authorizeSuperAdmin(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const { orgId } = await context.params;
    const csv = await exportOrgInvoicesCsv(orgId, { role: "superAdmin" });
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="invoices-${orgId}.csv"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
