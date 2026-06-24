import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { loginEmployee } from "@/src/server/services/employeeService";
import { getRepositoryContext } from "@/src/server/repositories/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantSlug, employeeCode, pin } = body;

    // ── Validate input ────────────────────────────────────────────────────────

    if (!tenantSlug || typeof tenantSlug !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Corporate selection is required.",
          errorCode: "TENANT_NOT_FOUND",
        },
        { status: 400 },
      );
    }

    if (!employeeCode || typeof employeeCode !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Employee ID is required.",
          errorCode: "INVALID_PIN",
        },
        { status: 400 },
      );
    }

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "PIN is required.",
          errorCode: "INVALID_PIN",
        },
        { status: 400 },
      );
    }

    // ── Resolve tenant ────────────────────────────────────────────────────────

    const repositories = await getRepositoryContext();
    const tenant = await repositories.tenants.findBySlug(tenantSlug);

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid corporate selection.",
          errorCode: "TENANT_NOT_FOUND",
        },
        { status: 401 },
      );
    }

    // ── Authenticate ──────────────────────────────────────────────────────────

    const result = await loginEmployee(tenant.tenantId, employeeCode.trim(), pin);

    if (!result.success) {
      const status =
        result.errorCode === "EMPLOYEE_LOCKED"
          ? 429
          : result.errorCode === "EMPLOYEE_INACTIVE"
            ? 403
            : 401;

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          lockedUntil: result.lockedUntil,
        },
        { status },
      );
    }

    // ── Success ───────────────────────────────────────────────────────────────

    return NextResponse.json(
      {
        success: true,
        employee: result.employee,
      },
      { status: 200 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
