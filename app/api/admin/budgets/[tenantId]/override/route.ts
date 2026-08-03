import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { overrideBudget } from "@/src/server/services/budgetService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Super Admin budget override. Authorized only via the `x-admin-api-key` shared
 * secret (the admin app's server-to-server calls). The tenant admin cannot
 * override a budget — they can only set (initial) or top-up.
 */
export async function POST(
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
    const body = await request.json().catch(() => ({}));

    const totalAmount = body.totalAmount;
    if (typeof totalAmount !== "number" || totalAmount <= 0) {
      return NextResponse.json(
        { error: "A valid totalAmount is required." },
        { status: 400 },
      );
    }

    const year = typeof body.year === "number" ? body.year : undefined;
    const reason = typeof body.reason === "string" ? body.reason : undefined;

    const overview = await overrideBudget(
      tenantId,
      year ?? new Date().getFullYear(),
      totalAmount,
      "super-admin",
      reason,
    );

    return NextResponse.json(overview, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
