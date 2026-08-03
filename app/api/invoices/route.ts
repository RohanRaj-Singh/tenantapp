import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { listInvoices } from "@/src/server/services/invoiceService";
import { resolveInvoiceScope } from "./_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const resolved = await resolveInvoiceScope(request);
  if (!resolved.success) {
    return resolved.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const skip = parseInt(searchParams.get("skip") ?? "0", 10) || 0;
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "20", 10) || 20,
      200,
    );

    const result = await listInvoices(resolved.scope, {
      tenantId,
      status,
      skip,
      limit,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
