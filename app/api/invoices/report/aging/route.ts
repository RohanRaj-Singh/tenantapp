import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { exportArLedgerCsv } from "@/src/server/services/invoiceService";
import { authorizeSuperAdmin } from "../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/report/aging
 *
 * Super-admin only. Streams the Accounts Receivable aging report as CSV
 * (org-first: outstanding, overdue, open invoices, aging status).
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeSuperAdmin(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const { searchParams } = new URL(request.url);
    const csv = await exportArLedgerCsv({
      tenantId: searchParams.get("tenantId") ?? undefined,
    });
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": 'attachment; filename="ar-aging-report.csv"',
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
