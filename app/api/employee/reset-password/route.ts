import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { resetPassword, validatePasswordStrength } from "@/src/server/services/employeeService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/employee/reset-password
 *
 * Auth: x-admin-api-key header (proxied from marketing site)
 *
 * Accepts:
 * {
 *   token: string;
 *   password: string;
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
    const { token, password } = body;

    // ── Validate input ────────────────────────────────────────────────────────

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: "This reset link is invalid or has expired.", errorCode: "INVALID_TOKEN" },
        { status: 400 },
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password is required.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const pwError = validatePasswordStrength(password);
    if (pwError) {
      return NextResponse.json(
        { success: false, error: pwError, errorCode: "WEAK_PASSWORD" },
        { status: 400 },
      );
    }

    // ── Reset password ────────────────────────────────────────────────────────

    const employee = await resetPassword(token, password);

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

      if (message.includes("invalid or has expired")) {
        return NextResponse.json(
          { success: false, error: message, errorCode: "INVALID_TOKEN" },
          { status: 400 },
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
