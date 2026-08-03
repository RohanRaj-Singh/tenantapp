import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { updateReimbursement } from "@/src/server/services/reimbursementService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeEmployeeApiRequest(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  return Boolean(apiKey && expectedKey && apiKey === expectedKey);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!authorizeEmployeeApiRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Valid API key required." },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const employeeCode = searchParams.get("employeeCode");

    const repositories = await getRepositoryContext();
    const reimbursement = await repositories.reimbursements.findById(id);

    if (!reimbursement) {
      return NextResponse.json(
        { error: "Claim not found." },
        { status: 404 },
      );
    }

    // If tenantId+employeeCode provided, verify ownership
    if (tenantId && employeeCode) {
      if (reimbursement.tenantId !== tenantId) {
        return NextResponse.json(
          { error: "Claim not found for this tenant." },
          { status: 404 },
        );
      }

      const employee = await repositories.employees.findByEmployeeCode(tenantId, employeeCode.trim());
      if (!employee || reimbursement.employeeId !== employee.employeeId) {
        return NextResponse.json(
          { error: "Claim not found." },
          { status: 404 },
        );
      }

      // ── Verify employee is active ──────────────────────────────────────
      if (employee.status !== "active") {
        return NextResponse.json(
          { error: "Employee account is not active." },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(reimbursement, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * Employee edits their own claim (e.g. after rejection → resubmit).
 * Ownership is verified the same way as GET. `updateReimbursement` resubmits
 * a `rejected` claim back to `pending` with a `Resubmitted:` history entry
 * and fires the `claim_resubmitted` notification.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!authorizeEmployeeApiRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Valid API key required." },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const employeeCode = searchParams.get("employeeCode");

    if (!tenantId || !employeeCode) {
      return NextResponse.json(
        { error: "tenantId and employeeCode are required." },
        { status: 400 },
      );
    }

    const repositories = await getRepositoryContext();
    const reimbursement = await repositories.reimbursements.findById(id);

    if (!reimbursement) {
      return NextResponse.json(
        { error: "Claim not found." },
        { status: 404 },
      );
    }

    if (reimbursement.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Claim not found for this tenant." },
        { status: 404 },
      );
    }

    const employee = await repositories.employees.findByEmployeeCode(tenantId, employeeCode.trim());
    if (!employee || reimbursement.employeeId !== employee.employeeId) {
      return NextResponse.json(
        { error: "Claim not found." },
        { status: 404 },
      );
    }

    if (employee.status !== "active") {
      return NextResponse.json(
        { error: "Employee account is not active." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const updates: {
      employeeId?: string;
      amount?: number;
      description?: string;
      notes?: string;
    } = {};

    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999_999) {
        return NextResponse.json(
          { error: "Amount must be greater than 0 and at most 999,999,999." },
          { status: 400 },
        );
      }
      updates.amount = amount;
    }

    if (body.description !== undefined) {
      if (typeof body.description !== "string" || body.description.trim().length === 0 || body.description.trim().length > 2000) {
        return NextResponse.json(
          { error: "Description must be 2000 characters or less." },
          { status: 400 },
        );
      }
      updates.description = body.description.trim();
    }

    if (body.notes !== undefined) {
      updates.notes = typeof body.notes === "string" ? body.notes.trim() : "";
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nothing to update." },
        { status: 400 },
      );
    }

    const updated = await updateReimbursement(
      tenantId,
      id,
      {
        ...updates,
        employeeId: employee.employeeId,
      },
      // Employee edit/resubmission is the ONLY path allowed to move a rejected
      // claim back to pending (approved state machine).
      { resubmit: true },
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Claim not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
