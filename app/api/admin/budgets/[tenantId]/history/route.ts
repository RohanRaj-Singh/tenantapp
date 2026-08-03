import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { listBudgetHistory } from "@/src/server/services/budgetHistoryService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Super Admin budget history. Authorized only via the `x-admin-api-key` shared
 * secret (the admin app's server-to-server calls). Returns the budget history
 * entries for the tenant (newest first) with optional `type`, `skip`, and
 * `limit` filters.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> },
) {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { tenantId } = await context.params;
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") ?? undefined;
    const skip = parseInt(searchParams.get("skip") ?? "0", 10);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    const history = await listBudgetHistory(tenantId, {
      type,
      skip: Number.isNaN(skip) || skip < 0 ? 0 : skip,
      limit: Number.isNaN(limit) || limit < 1 ? 50 : Math.min(limit, 200),
    });

    return NextResponse.json({ history }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
