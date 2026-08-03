import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import { listBudgetHistory } from "@/src/server/services/budgetHistoryService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) return auth.response;

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? undefined;
    const skip = Number.parseInt(url.searchParams.get("skip") ?? "0", 10) || 0;
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) || 50 : 50;

    const history = await listBudgetHistory(auth.context.tenant.tenantId, {
      type,
      skip,
      limit,
    });

    return NextResponse.json({ history }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
