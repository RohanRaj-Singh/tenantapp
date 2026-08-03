import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { requestPasswordReset } from "@/src/server/services/employeeService";
import { checkRateLimit } from "@/src/server/services/rateLimiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Minimum interval between reset requests for the same email (5 minutes). */
const RESET_REQUEST_WINDOW_MS = 5 * 60 * 1000;

/**
 * POST /api/employee/forgot-password
 *
 * Auth: x-admin-api-key header (proxied from marketing site)
 *
 * Accepts:
 * {
 *   tenantSlug: string;
 *   email: string;
 * }
 *
 * Response is always a generic success — never reveals whether the email
 * exists (prevents account enumeration).
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
    const { tenantSlug, email } = body;

    // ── Validate input ────────────────────────────────────────────────────────

    if (!tenantSlug || typeof tenantSlug !== "string") {
      return NextResponse.json(
        { success: false, error: "Organization is required.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Email is required.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    // ── Rate limit by email ───────────────────────────────────────────────────

    const normalizedEmail = email.trim().toLowerCase();
    if (!checkRateLimit(`forgot-password:${normalizedEmail}`, RESET_REQUEST_WINDOW_MS)) {
      // Same generic response so we don't reveal anything about the email.
      return NextResponse.json(
        { success: true, message: "If that email exists, a reset link has been sent." },
        { status: 200 },
      );
    }

    // ── Resolve tenant + request reset ────────────────────────────────────────

    const repositories = await getRepositoryContext();
    const tenant = await repositories.tenants.findBySlug(tenantSlug);

    if (tenant) {
      await requestPasswordReset(tenant.tenantId, normalizedEmail);
    }
    // Unknown tenant → no-op, still returns the generic success.

    return NextResponse.json(
      { success: true, message: "If that email exists, a reset link has been sent." },
      { status: 200 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
