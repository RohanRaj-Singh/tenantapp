import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { markInvoicePaid } from "@/src/server/services/invoiceService";
import { authorizeSuperAdmin } from "../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeSuperAdmin(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const { id } = await context.params;
    const invoice = await markInvoicePaid(id, "super-admin");
    return NextResponse.json(invoice, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
