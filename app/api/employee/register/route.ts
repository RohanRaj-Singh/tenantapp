import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import { registerEmployee, validatePasswordStrength } from "@/src/server/services/employeeService";
import { getRepositoryContext } from "@/src/server/repositories/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantSlug, employeeCode, email, password, name, phone, phoneNumber, bankAccountNumber, bankName, inviteToken } = body;
    // Accept either `phoneNumber` (marketing register form) or the legacy `phone` field.
    const contactNumber = typeof phoneNumber === "string" && phoneNumber.trim() ? phoneNumber : phone;

    // ── Validate input ────────────────────────────────────────────────────────

    if (!tenantSlug || typeof tenantSlug !== "string") {
      return NextResponse.json(
        { success: false, error: "Please select your organization.", errorCode: "TENANT_NOT_FOUND" },
        { status: 400 },
      );
    }

    if (!employeeCode || typeof employeeCode !== "string" || !employeeCode.trim()) {
      return NextResponse.json(
        { success: false, error: "Employee code is required.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Email is required.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address.", errorCode: "VALIDATION_ERROR" },
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

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Full name is required.", errorCode: "NAME_REQUIRED" },
        { status: 400 },
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: "Name must be 100 characters or fewer.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (phone !== undefined && phone !== null && typeof phone !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (phoneNumber !== undefined && phoneNumber !== null && typeof phoneNumber !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (bankAccountNumber !== undefined && bankAccountNumber !== null && typeof bankAccountNumber !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid bank account number format.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (bankName !== undefined && bankName !== null && typeof bankName !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid bank name format.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    // ── Resolve tenant ────────────────────────────────────────────────────────

    const repositories = await getRepositoryContext();
    const tenant = await repositories.tenants.findBySlug(tenantSlug);

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Invalid organization. Please try again.", errorCode: "TENANT_NOT_FOUND" },
        { status: 400 },
      );
    }

    // ── Register ──────────────────────────────────────────────────────────────

    const employee = await registerEmployee(
      tenant.tenantId,
      employeeCode.trim(),
      email.trim(),
      password,
      name.trim(),
      typeof contactNumber === "string" && contactNumber.trim() ? contactNumber.trim() : undefined,
      typeof inviteToken === "string" ? inviteToken.trim() : undefined,
      typeof bankAccountNumber === "string" && bankAccountNumber.trim() ? bankAccountNumber.trim() : undefined,
      typeof bankName === "string" && bankName.trim() ? bankName.trim() : undefined,
    );

    return NextResponse.json(
      {
        success: true,
        employee,
      },
      { status: 201 },
    );
  } catch (error) {
    // Handle known business logic errors from service layer
    if (error instanceof Error) {
      const message = error.message;
      let status = 400;
      let errorCode = "REGISTRATION_FAILED";

      if (message.includes("not found")) {
        status = 404;
        errorCode = "EMPLOYEE_NOT_FOUND";
      } else if (message.includes("already been registered")) {
        status = 409;
        errorCode = "ALREADY_REGISTERED";
      } else if (message.includes("not match our records")) {
        status = 400;
        errorCode = "EMAIL_MISMATCH";
      } else if (message.includes("not available for registration")) {
        status = 403;
        errorCode = "ACCOUNT_NOT_AVAILABLE";
      }

      return NextResponse.json(
        { success: false, error: message, errorCode },
        { status },
      );
    }

    return apiErrorResponse(error);
  }
}
