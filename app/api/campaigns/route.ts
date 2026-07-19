import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { requireTenantApiAuth } from "@/src/modules/tenant-auth/middleware/tenant-auth";
import {
  listCampaigns,
  createCampaign,
} from "@/src/server/services/invitationService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireTenantApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);

    const result = await listCampaigns(auth.context.tenant.tenantId, {
      search: url.searchParams.get("search") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
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

    const campaign = await createCampaign(auth.context.tenant.tenantId, {
      name: body.name,
      scheduledFor: body.scheduledFor,
      createdBy: auth.context.user.id,
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
