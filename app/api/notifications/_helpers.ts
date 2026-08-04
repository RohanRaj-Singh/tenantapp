import { NextRequest, NextResponse } from "next/server";
import { getRepositoryContext } from "@/src/server/repositories/context";
import type { NotificationRecipientType } from "@/src/server/db/documents";

export interface NotificationRecipientContext {
  tenantId: string;
  recipientType: NotificationRecipientType;
  recipientId: string;
}

export type ResolveNotificationRecipientResult =
  | { success: true; context: NotificationRecipientContext }
  | { success: false; response: NextResponse };

/**
 * Resolves the notification recipient for a request across the three auth silos:
 *  1. `x-admin-api-key` + `tenantId`/`employeeCode`  → employee (marketing portal proxy)
 *  2. `x-admin-api-key` alone                        → super admin (admin app proxy)
 *  3. tenant dashboard session                       → tenant admin (same-origin dashboard)
 */
export async function resolveNotificationRecipient(
  request: NextRequest,
): Promise<ResolveNotificationRecipientResult> {
  const apiKey = request.headers.get("x-admin-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;

  if (apiKey && expectedKey && apiKey === expectedKey) {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const employeeCode = searchParams.get("employeeCode");

    if (tenantId && employeeCode) {
      const repositories = await getRepositoryContext();
      const employee = await repositories.employees.findByEmployeeCode(
        tenantId,
        employeeCode.trim(),
      );

      if (!employee) {
        return {
          success: false,
          response: NextResponse.json(
            { error: "Employee not found for this tenant." },
            { status: 404 },
          ),
        };
      }

      if (employee.status !== "active") {
        return {
          success: false,
          response: NextResponse.json(
            { error: "Employee account is not active." },
            { status: 403 },
          ),
        };
      }

      return {
        success: true,
        context: {
          tenantId,
          recipientType: "employee",
          recipientId: employee.employeeId,
        },
      };
    }

    // API key without employee params → super admin
    return {
      success: true,
      context: {
        tenantId: "",
        recipientType: "superAdmin",
        recipientId: "super-admin",
      },
    };
  }

  // Tenant dashboard session → tenant admin
  const { requireTenantApiAuth } = await import("@/src/modules/tenant-auth/middleware/tenant-auth");
  const auth = await requireTenantApiAuth();
  if (auth.success) {
    return {
      success: true,
      context: {
        tenantId: auth.context.tenant.tenantId,
        recipientType: "tenantAdmin",
        recipientId: auth.context.user.id,
      },
    };
  }

  // Clinic portal session → clinic user
  const { getCurrentClinicAuthContext } = await import("@/src/modules/clinic-auth/middleware/clinic-auth");
  const clinicCtx = await getCurrentClinicAuthContext();
  if (clinicCtx) {
    return {
      success: true,
      context: {
        tenantId: "",
        recipientType: "clinic",
        recipientId: clinicCtx.user.clinicUserId,
      },
    };
  }

  return { success: false, response: auth.response };
}
