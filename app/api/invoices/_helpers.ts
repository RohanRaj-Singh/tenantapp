import { NextRequest, NextResponse } from "next/server";
import type { InvoiceScope } from "@/src/server/services/invoiceService";

export type ResolveInvoiceScopeResult =
  | { success: true; scope: InvoiceScope }
  | { success: false; response: NextResponse };

/**
 * Resolves the access scope for an invoice request across the two auth silos:
 *  1. `x-admin-api-key` alone → super admin (admin app proxy)
 *  2. tenant dashboard session → tenant admin (same-origin dashboard)
 */
export async function resolveInvoiceScope(
  request: NextRequest,
): Promise<ResolveInvoiceScopeResult> {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;

  if (apiKey && expectedKey && apiKey === expectedKey) {
    return {
      success: true,
      scope: { role: "superAdmin" },
    };
  }

  const { requireTenantApiAuth } = await import("@/src/modules/tenant-auth/middleware/tenant-auth");
  const auth = await requireTenantApiAuth();
  if (auth.success) {
    return {
      success: true,
      scope: {
        role: "tenantAdmin",
        tenantId: auth.context.tenant.tenantId,
      },
    };
  }

  return { success: false, response: auth.response };
}

export interface AuthorizeSuperAdminResult {
  authorized: boolean;
  response?: NextResponse;
}

/**
 * Authorizes super-admin-only operations (generate, issue, pay).
 * Requires the `x-admin-api-key` header matching the ADMIN_API_KEY env var.
 */
export async function authorizeSuperAdmin(
  request: NextRequest,
): Promise<AuthorizeSuperAdminResult> {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;
  if (apiKey && expectedKey && apiKey === expectedKey) {
    return { authorized: true };
  }

  return {
    authorized: false,
    response: NextResponse.json(
      { error: "Unauthorized. Super Admin access required." },
      { status: 401 },
    ),
  };
}
