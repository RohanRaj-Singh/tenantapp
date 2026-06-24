import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import {
  listReimbursements,
  createReimbursement,
} from "@/src/server/services/reimbursementService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CLAIM_AMOUNT = 999_999_999;

export async function GET(request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);

    const result = await listReimbursements(auth.context.tenant.tenantId, {
      search: url.searchParams.get("search") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      employeeId: url.searchParams.get("employeeId") ?? undefined,
      skip: parseInt(url.searchParams.get("skip") ?? "0", 10),
      limit: parseInt(url.searchParams.get("limit") ?? "20", 10),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = await request.json();

    if (!body.employeeId || !body.type || body.amount == null || !body.description) {
      return NextResponse.json(
        { error: "employeeId, type, amount, and description are required." },
        { status: 400 },
      );
    }

    if (typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0." },
        { status: 400 },
      );
    }

    if (body.amount > MAX_CLAIM_AMOUNT) {
      return NextResponse.json(
        { error: `Amount must be ${MAX_CLAIM_AMOUNT.toLocaleString()} or less.` },
        { status: 400 },
      );
    }

    const reimbursement = await createReimbursement(auth.context.tenant.tenantId, {
      employeeId: body.employeeId,
      employeeName: body.employeeName || "",
      type: body.type,
      amount: body.amount,
      description: body.description,
      receiptUrl: body.receiptUrl,
    });

    return NextResponse.json(reimbursement, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
