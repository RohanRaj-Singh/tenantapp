import { getRepositoryContext } from "@/src/server/repositories/context";
import type {
  SafeEmployee,
  SuperAdminEmployeeListItem,
} from "@/src/server/services/employeeService";

/**
 * Build a SuperAdminEmployeeListItem from a SafeEmployee,
 * resolving the tenant name from the repository.
 */
export async function buildEmployeeDetail(employee: SafeEmployee): Promise<SuperAdminEmployeeListItem> {
  const repositories = await getRepositoryContext();
  const tenant = await repositories.tenants.findByTenantId(employee.tenantId);

  return {
    employeeId: employee.employeeId,
    employeeCode: employee.employeeCode,
    email: employee.email,
    name: employee.name ?? "",
    phoneNumber: employee.phoneNumber ?? null,
    status: employee.status,
    tenantId: employee.tenantId,
    tenantName: tenant?.name ?? employee.tenantId,
    failedLoginAttempts: employee.failedLoginAttempts,
    lockedUntil: employee.lockedUntil,
    lastAccessAt: employee.lastAccessAt,
    mustChangePassword: employee.mustChangePassword,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}
