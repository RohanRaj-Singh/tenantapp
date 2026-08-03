import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import {
  getBudgetOverview,
  setBudget,
  topUpBudget,
} from "@/src/server/services/budgetService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseYear(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export async function GET(request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) return auth.response;

  try {
    const url = new URL(request.url);
    const year = parseYear(url.searchParams.get("year"));
    const overview = await getBudgetOverview(auth.context.tenant.tenantId, year);
    return NextResponse.json(overview, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { action, amount, year: yearParam, reason } = body;
    const year = parseYear(yearParam) ?? new Date().getFullYear();

    if (!action || !amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Valid action and amount are required." },
        { status: 400 },
      );
    }

    if (action === "set") {
      const result = await setBudget(
        auth.context.tenant.tenantId,
        year,
        amount,
        auth.context.user.id,
      );
      return NextResponse.json(result, { status: 200 });
    }

    if (action === "topup") {
      const overview = await topUpBudget(
        auth.context.tenant.tenantId,
        year,
        amount,
        auth.context.user.id,
        typeof reason === "string" && reason.trim() ? reason.trim() : undefined,
      );
      return NextResponse.json(overview, { status: 200 });
    }

    return NextResponse.json({ error: "Unknown action. Use 'set' or 'topup'." }, { status: 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
