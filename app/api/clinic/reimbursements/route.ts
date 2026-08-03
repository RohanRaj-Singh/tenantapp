import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { requireClinicApiAuth } from "@/src/modules/clinic-auth/middleware/clinic-auth";
import {
  createClinicReimbursement,
  listClinicReimbursements,
} from "@/src/server/services/clinicPortalService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireClinicApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const skip = parseInt(searchParams.get("skip") ?? "0", 10);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    const result = await listClinicReimbursements(auth.context.user, {
      status,
      search,
      skip: Number.isFinite(skip) ? skip : 0,
      limit: Math.min(Number.isFinite(limit) ? limit : 50, 500),
    });

    return NextResponse.json(
      { claims: result.claims, total: result.total },
      { status: 200 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireClinicApiAuth();
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = await request.json();

    // Resolve clinic name from the user's clinic directory entry.
    const repositories = await getRepositoryContext();
    const clinicId = String(body?.clinicId ?? "");
    const clinic = await repositories.clinics.findById(clinicId);
    const clinicName = clinic?.name ?? body?.clinicName ?? auth.context.user.name;

    const claim = await createClinicReimbursement(
      auth.context.user,
      clinicName,
      {
        tenantId: String(body?.tenantId ?? ""),
        clinicId,
        employeeCode: String(body?.employeeCode ?? ""),
        amount: Number(body?.amount),
        description: String(body?.description ?? ""),
        receiptUrl: body?.receiptUrl,
        receiptHash: body?.receiptHash,
        serviceDate: body?.serviceDate,
        sessionCount:
          body?.sessionCount !== undefined ? Number(body.sessionCount) : undefined,
        sessionTypes: Array.isArray(body?.sessionTypes) ? body.sessionTypes : undefined,
        sessionFor: body?.sessionFor,
        sessionForOther: body?.sessionForOther,
      },
    );

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
