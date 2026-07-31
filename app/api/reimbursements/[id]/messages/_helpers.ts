import { NextRequest, NextResponse } from "next/server";
import { getRepositoryContext } from "@/src/server/repositories/context";
import type { ClaimMessageParticipant } from "@/src/server/db/documents";

export interface ChatParticipantContext {
  tenantId: string;
  participant: ClaimMessageParticipant;
  canPost: boolean;
}

/**
 * Resolves the claim-chat participant across the three auth silos:
 *  1. `x-admin-api-key` + `tenantId`/`employeeCode`  → employee (marketing portal proxy)
 *  2. `x-admin-api-key` alone                        → super admin (read-only oversight)
 *  3. tenant dashboard session                       → tenant admin
 */
export async function resolveChatParticipant(
  request: NextRequest,
): Promise<
  | { success: true; context: ChatParticipantContext }
  | { success: false; response: NextResponse }
> {
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
          participant: {
            role: "employee",
            id: employee.employeeId,
            name: employee.name ?? employee.employeeCode,
            key: `employee:${employee.employeeId}`,
          },
          canPost: true,
        },
      };
    }

    // API key without employee params → super admin (read-only oversight)
    return {
      success: true,
      context: {
        tenantId: "",
        participant: {
          role: "superAdmin",
          id: "super-admin",
          name: "Super Admin",
          key: "superAdmin:super-admin",
        },
        canPost: false,
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
        participant: {
          role: "tenantAdmin",
          id: auth.context.user.id,
          name: auth.context.user.username,
          key: `tenantAdmin:${auth.context.user.id}`,
        },
        canPost: true,
      },
    };
  }

  return { success: false, response: auth.response };
}
