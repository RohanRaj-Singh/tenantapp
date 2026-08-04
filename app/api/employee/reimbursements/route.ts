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

    // Strip any sensitive fields from response.
    // `latestUpdate` is the most recent history entry (status change, reviewer note,
    // or progress update) so the employee portal can surface the latest update in list rows.
    // Bank details (bankAccountNumber/bankName) are the claim's immutable payout
    // snapshot and are returned so the employee can confirm what is on file.
    const safe = result.reimbursements.map((r) => {
      const history = r.history ?? [];
      const latest = history[history.length - 1];
      return {
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
        bankAccountNumber: r.bankAccountNumber,
        bankName: r.bankName,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        latestUpdate: latest
          ? {
              status: latest.status,
              actorRole: latest.actorRole,
              note: latest.note ?? null,
              timestamp: latest.timestamp,
            }
          : null,
      };
    });

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
    const { tenantId, employeeCode, clinicId, clinicName, amount, description, receiptUrl, receiptHash, serviceDate, sessionCount, sessionTypes, sessionFor, sessionForOther, contactCountryCode, contactNumber, bankAccountNumber, bankName } = body;

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

    // Bank details are required so every claim carries a complete payout snapshot.
    if (!bankAccountNumber || typeof bankAccountNumber !== "string" || !bankAccountNumber.trim()) {
      return NextResponse.json(
        { error: "Bank account number is required." },
        { status: 400 },
      );
    }
    if (!bankName || typeof bankName !== "string" || !bankName.trim()) {
      return NextResponse.json(
        { error: "Bank name is required." },
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

    const employeeName = employee.name ?? "";
    const reimbursement = await createEmployeeReimbursement(
      tenantId,
      employee.employeeId,
      employeeName,
      {
        clinicId: clinicId.trim(),
        clinicName: clinicName.trim(),
        amount,
        description: description.trim(),
        receiptUrl: receiptUrl?.trim(),
        receiptHash: typeof receiptHash === "string" ? receiptHash : undefined,
        serviceDate: typeof serviceDate === "string" ? serviceDate : undefined,
        sessionCount: typeof sessionCount === "number" ? sessionCount : undefined,
        sessionTypes: Array.isArray(sessionTypes) ? sessionTypes : undefined,
        sessionFor: typeof sessionFor === "string" ? sessionFor : undefined,
        sessionForOther: typeof sessionForOther === "string" ? sessionForOther : undefined,
        contactCountryCode: typeof contactCountryCode === "string" ? contactCountryCode : undefined,
        contactNumber: typeof contactNumber === "string" ? contactNumber : undefined,
        bankAccountNumber: typeof bankAccountNumber === "string" ? bankAccountNumber : undefined,
        bankName: typeof bankName === "string" ? bankName : undefined,
      },
    );

    return NextResponse.json(reimbursement, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
