import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { loginEmployee } from "@/src/server/services/employeeService";
import { getRepositoryContext } from "@/src/server/repositories/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantSlug, email, password } = body;

    // ── Validate input ────────────────────────────────────────────────────────

    if (!tenantSlug || typeof tenantSlug !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Please select your organization.",
          errorCode: "TENANT_NOT_FOUND",
        },
        { status: 400 },
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required.",
          errorCode: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Password is required.",
          errorCode: "VALIDATION_ERROR",
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
          error: "Invalid organization. Please try again.",
          errorCode: "TENANT_NOT_FOUND",
        },
        { status: 401 },
      );
    }

    // ── Authenticate with email + password ────────────────────────────────────

    const result = await loginEmployee(tenant.tenantId, email.trim(), password);

    if (!result.success) {
      const status =
        result.errorCode === "EMPLOYEE_LOCKED"
          ? 429
          : result.errorCode === "EMPLOYEE_INACTIVE" ||
              result.errorCode === "EMPLOYEE_SUSPENDED" ||
              result.errorCode === "EMPLOYEE_ARCHIVED" ||
              result.errorCode === "NOT_REGISTERED"
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

    // ── Success — return LoginResponse ────────────────────────────────────────

    return NextResponse.json(
      {
        success: true,
        employee: result.employee,
        ...(result.mustChangePassword ? { mustChangePassword: true } : {}),
      },
      { status: 200 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
