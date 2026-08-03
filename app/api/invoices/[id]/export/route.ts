import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { exportInvoiceCsv } from "@/src/server/services/invoiceService";
import { resolveInvoiceScope } from "../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const resolved = await resolveInvoiceScope(request);
  if (!resolved.success) {
    return resolved.response;
  }

  try {
    const { id } = await context.params;
    const csv = await exportInvoiceCsv(id, resolved.scope);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="invoice-${id}.csv"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
