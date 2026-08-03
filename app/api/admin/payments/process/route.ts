import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { processPayments } from "@/src/server/services/paymentService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorizes payout processing.
 * Only Super Admin can run payouts — requires the `x-admin-api-key` header
 * matching ADMIN_API_KEY env var. The Super Admin dashboard proxy passes this
 * key for server-to-server calls.
 */
function authorizeRequest(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  return Boolean(apiKey && expectedKey && apiKey === expectedKey);
}

/**
 * POST /api/admin/payments/process
 *
 * Body: `{ claimIds?: string[] }` — empty/absent = process every `to_be_paid`
 * claim. Returns `{ processed: number }`.
 */
export async function POST(request: NextRequest) {
  if (!authorizeRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Super Admin access required." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const claimIds = Array.isArray(body.claimIds) ? body.claimIds : undefined;

    if (claimIds !== undefined) {
      const nonStrings = claimIds.some((id: unknown) => typeof id !== "string" || id.trim() === "");
      if (nonStrings) {
        return NextResponse.json(
          { error: "claimIds must be an array of non-empty strings." },
          { status: 400 },
        );
      }
    }

    const result = await processPayments({
      claimIds,
      actorId: "super-admin",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
