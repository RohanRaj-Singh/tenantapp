import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { generateInvoice } from "@/src/server/services/invoiceService";
import { authorizeSuperAdmin } from "../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await authorizeSuperAdmin(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await request.json().catch(() => ({}));

    if (!body.tenantId || !body.from || !body.to) {
      return NextResponse.json(
        { error: "tenantId, from, and to are required." },
        { status: 400 },
      );
    }

    const invoice = await generateInvoice({
      tenantId: body.tenantId,
      from: body.from,
      to: body.to,
      generatedBy: "super-admin",
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
