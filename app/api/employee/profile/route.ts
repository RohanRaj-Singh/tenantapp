import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { updateEmployeeProfile, getSafeEmployee } from "@/src/server/services/employeeService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorizes the request — requires x-admin-api-key (proxied from marketing site)
 * or a valid tenant session (for future Super Admin use).
 */
async function authorizeRequest(request: NextRequest): Promise<{ authorized: boolean; employeeId?: string; response?: NextResponse }> {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  if (apiKey && expectedKey && apiKey === expectedKey) {
    return { authorized: true };
  }

  return {
    authorized: false,
    response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
  };
}

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response!;

  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const tenantId = searchParams.get("tenantId");

    if (!employeeId || !tenantId) {
      return NextResponse.json(
        { error: "employeeId and tenantId are required." },
        { status: 400 },
      );
    }

    // Returns the safe employee profile incl. bank details (bankAccountNumber,
    // bankName) so the employee portal can prefill claim forms from the profile.
    const employee = await getSafeEmployee(employeeId, tenantId);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, employee }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const { employeeId, name, phoneNumber, bankAccountNumber, bankName } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required." }, { status: 400 });
    }

    const employee = await updateEmployeeProfile(employeeId, {
      name,
      phoneNumber,
      bankAccountNumber,
      bankName,
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, employee }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
