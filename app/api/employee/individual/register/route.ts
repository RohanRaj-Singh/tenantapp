import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/src/server/api/responses";
import {
  registerIndividual,
  validatePasswordStrength,
} from "@/src/server/services/employeeService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public self-service registration for an individual (no organisation,
 * no employee record). Public endpoint — deliberately no admin-key check,
 * matching the org `/api/employee/register` route.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phoneNumber, bankAccountNumber, bankName } = body;

    // ── Validate input ────────────────────────────────────────────────────────

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Email is required.", errorCode: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (!EMAIL_REGEX.test(email.trim())) {
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

    // ── Register the individual ───────────────────────────────────────────────

    const employee = await registerIndividual(
      email.trim(),
      password,
      name.trim(),
      typeof phoneNumber === "string" && phoneNumber.trim() ? phoneNumber.trim() : undefined,
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

      if (message.includes("already registered")) {
        status = 409;
        errorCode = "ALREADY_REGISTERED";
      }

      return NextResponse.json(
        { success: false, error: message, errorCode },
        { status },
      );
    }

    return apiErrorResponse(error);
  }
}
