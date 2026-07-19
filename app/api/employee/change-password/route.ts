import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { changePassword, validatePasswordStrength } from "@/src/server/services/employeeService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/employee/change-password
 *
 * Auth: x-admin-api-key header (proxied from marketing site)
 *
 * Accepts:
 * {
 *   employeeId: string;
 *   currentPassword: string;
 *   newPassword: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // ── Validate API key ──────────────────────────────────────────────────────
    const apiKey = request.headers.get("x-admin-api-key");
    const expectedKey = process.env.ADMIN_API_KEY;
    if (!apiKey || !expectedKey || apiKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized.", errorCode: "NOT_AUTHENTICATED" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { employeeId, currentPassword, newPassword } = body;

    // ── Validate input ────────────────────────────────────────────────────────

    if (!employeeId || typeof employeeId !== "string") {
      return NextResponse.json(
        { success: false, error: "Employee ID is required.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (!currentPassword || typeof currentPassword !== "string") {
      return NextResponse.json(
        { success: false, error: "Current password is required.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { success: false, error: "New password is required.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const pwError = validatePasswordStrength(newPassword);
    if (pwError) {
      return NextResponse.json(
        { success: false, error: pwError, errorCode: "WEAK_PASSWORD" },
        { status: 400 },
      );
    }

    // ── Change password ───────────────────────────────────────────────────────

    const employee = await changePassword(employeeId, currentPassword, newPassword);

    return NextResponse.json(
      {
        success: true,
        employee,
      },
      { status: 200 },
    );
  } catch (error) {
    // Handle known business logic errors
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes("not found")) {
        return NextResponse.json(
          { success: false, error: "Employee not found.", errorCode: "EMPLOYEE_NOT_FOUND" },
          { status: 404 },
        );
      }

      if (message.includes("not been registered")) {
        return NextResponse.json(
          { success: false, error: message, errorCode: "NOT_REGISTERED" },
          { status: 403 },
        );
      }

      if (message.includes("Current password is incorrect") || message.includes("incorrect")) {
        return NextResponse.json(
          { success: false, error: "Current password is incorrect.", errorCode: "INVALID_PASSWORD" },
          { status: 401 },
        );
      }

      if (message.includes("Password must be")) {
        return NextResponse.json(
          { success: false, error: message, errorCode: "WEAK_PASSWORD" },
          { status: 400 },
        );
      }
    }

    return apiErrorResponse(error);
  }
}
