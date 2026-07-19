import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { payReimbursement } from "@/src/server/services/reimbursementService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorizes pay requests.
 * Only Super Admin can mark claims as paid — requires x-admin-api-key header
 * matching ADMIN_API_KEY env var. The Super Admin dashboard proxy passes this key.
 */
async function authorizeRequest(request: NextRequest): Promise<{ authorized: boolean; response?: NextResponse }> {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  if (apiKey && expectedKey && apiKey === expectedKey) {
    return { authorized: true };
  }

  return {
    authorized: false,
    response: NextResponse.json(
      { error: "Unauthorized. Super Admin access required." },
      { status: 401 },
    ),
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const { getRepositoryContext } = await import("@/src/server/repositories/context");
    const repositories = await getRepositoryContext();
    const claim = await repositories.reimbursements.findById(id);

    if (!claim) {
      return NextResponse.json({ error: "Reimbursement not found." }, { status: 404 });
    }

    const reimbursement = await payReimbursement(
      claim.tenantId,
      id,
      "super-admin",
      body.notes,
    );

    if (!reimbursement) {
      return NextResponse.json({ error: "Reimbursement not found." }, { status: 404 });
    }

    return NextResponse.json(reimbursement, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cannot change status")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
