import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { createEmployeeReimbursement } from "@/src/server/services/reimbursementService";
import { getRepositoryContext } from "@/src/server/repositories/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CLAIM_AMOUNT = 999_999_999;

/**
 * Authorizes requests to the employee-facing claims API.
 * Requires an `x-admin-api-key` header matching ADMIN_API_KEY env var.
 * This ensures only the marketing site proxy (which validates employee sessions)
 * can submit or read claims on behalf of employees.
 */
async function authorizeEmployeeApiRequest(request: NextRequest): Promise<{ authorized: boolean; response?: NextResponse }> {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;

  if (apiKey && expectedKey && apiKey === expectedKey) {
    return { authorized: true };
  }

  return {
    authorized: false,
    response: NextResponse.json(
      { error: "Unauthorized. Valid API key required." },
      { status: 401 },
    ),
  };
}

export async function GET(request: NextRequest) {
  const auth = await authorizeEmployeeApiRequest(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const employeeCode = searchParams.get("employeeCode");
    const status = searchParams.get("status");

    // ── Validate required params ───────────────────────────────────────────

    if (!tenantId || !employeeCode) {
      return NextResponse.json(
        { error: "tenantId and employeeCode are required." },
        { status: 400 },
      );
    }

    // ── Verify employee exists in tenant ──────────────────────────────────

    const repositories = await getRepositoryContext();
    const employee = await repositories.employees.findByEmployeeCode(tenantId, employeeCode.trim());

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found for this tenant." },
        { status: 404 },
      );
    }

    // ── Verify employee is active ────────────────────────────────────────

    if (employee.status !== "active") {
      return NextResponse.json(
        { error: "Employee account is not active." },
        { status: 403 },
      );
    }

    // ── Fetch claims for this employee ────────────────────────────────────

    const result = await repositories.reimbursements.findByTenantId(tenantId, {
      employeeId: employee.employeeId,
      status: status && status !== "all" ? status : undefined,
      limit: 50,
    });

    // Strip any sensitive fields from response
    const safe = result.reimbursements.map((r) => ({
      reimbursementId: r.reimbursementId,
      claimNumber: r.claimNumber,
      tenantId: r.tenantId,
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      type: r.type,
      amount: r.amount,
      description: r.description,
      clinicId: r.clinicId,
      clinicName: r.clinicName,
      receiptUrl: r.receiptUrl,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return NextResponse.json({ reimbursements: safe, total: result.total }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeEmployeeApiRequest(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await request.json();
    const { tenantId, employeeCode, clinicId, clinicName, amount, description, receiptUrl, receiptHash, serviceDate } = body;

    // ── Validate required fields ───────────────────────────────────────────

    if (!tenantId || typeof tenantId !== "string") {
      return NextResponse.json(
        { error: "Tenant is required." },
        { status: 400 },
      );
    }

    if (!employeeCode || typeof employeeCode !== "string") {
      return NextResponse.json(
        { error: "Employee code is required." },
        { status: 400 },
      );
    }

    if (!clinicId || typeof clinicId !== "string") {
      return NextResponse.json(
        { error: "Please select a clinic." },
        { status: 400 },
      );
    }

    if (!clinicName || typeof clinicName !== "string") {
      return NextResponse.json(
        { error: "Clinic name is required." },
        { status: 400 },
      );
    }

    if (amount == null || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0." },
        { status: 400 },
      );
    }

    if (amount > MAX_CLAIM_AMOUNT) {
      return NextResponse.json(
        { error: `Amount must be ${MAX_CLAIM_AMOUNT.toLocaleString()} or less.` },
        { status: 400 },
      );
    }

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Description is required." },
        { status: 400 },
      );
    }

    if (description.trim().length > 2000) {
      return NextResponse.json(
        { error: "Description must be 2000 characters or less." },
        { status: 400 },
      );
    }

    // ── Verify employee exists in this tenant ──────────────────────────────

    const repositories = await getRepositoryContext();
    const employee = await repositories.employees.findByEmployeeCode(tenantId, employeeCode.trim());

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found for this tenant." },
        { status: 404 },
      );
    }

    if (employee.status !== "active") {
      return NextResponse.json(
        { error: "Employee account is not active." },
        { status: 403 },
      );
    }

    // ── Create claim ───────────────────────────────────────────────────────

    const reimbursement = await createEmployeeReimbursement(
      tenantId,
      employee.employeeId,
      employee.name,
      {
        clinicId: clinicId.trim(),
        clinicName: clinicName.trim(),
        amount,
        description: description.trim(),
        receiptUrl: receiptUrl?.trim(),
        receiptHash: typeof receiptHash === "string" ? receiptHash : undefined,
        serviceDate: typeof serviceDate === "string" ? serviceDate : undefined,
      },
    );

    return NextResponse.json(reimbursement, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
