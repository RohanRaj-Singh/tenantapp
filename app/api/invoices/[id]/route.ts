import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { getInvoice } from "@/src/server/services/invoiceService";
import { resolveInvoiceScope } from "../_helpers";

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
    const invoice = await getInvoice(id, resolved.scope);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    return NextResponse.json(invoice, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
