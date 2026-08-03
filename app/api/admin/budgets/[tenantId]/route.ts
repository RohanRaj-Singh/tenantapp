import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { getBudgetOverview } from "@/src/server/services/budgetService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Super Admin budget overview. Authorized only via the `x-admin-api-key` shared
 * secret (the admin app's server-to-server calls). Returns the full annual
 * budget overview (total / reserved / committed / paid / available) for the
 * tenant, defaulting to the current year unless `?year=` is supplied.
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
    const rawYear = searchParams.get("year");
    const year =
      rawYear !== null && rawYear.trim() !== ""
        ? parseInt(rawYear, 10)
        : undefined;

    if (year !== undefined && (Number.isNaN(year) || year < 2000 || year > 2200)) {
      return NextResponse.json(
        { error: "A valid year is required." },
        { status: 400 },
      );
    }

    const overview = await getBudgetOverview(tenantId, year);
    return NextResponse.json({ ...overview }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
