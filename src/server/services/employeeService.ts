import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import type {
  FindEmployeesOptions,
  FindEmployeesResult,
} from "@/src/server/repositories/contracts";

export async function listEmployees(
  tenantId: string,
  options?: FindEmployeesOptions,
): Promise<FindEmployeesResult> {
  const repositories = await getRepositoryContext();
  return repositories.employees.findByTenantId(tenantId, options);
}

export async function getEmployee(
  tenantId: string,
  employeeId: string,
) {
  const repositories = await getRepositoryContext();
  const employee = await repositories.employees.findById(employeeId);

  if (!employee || employee.tenantId !== tenantId) {
    return null;
  }

  return employee;
}

export async function createEmployee(
  tenantId: string,
  data: {
    employeeCode: string;
    name: string;
    email: string;
  },
) {
  const now = new Date().toISOString();
  const employee = {
    employeeId: `emp_${randomUUID()}`,
    tenantId,
    employeeCode: data.employeeCode.trim(),
    name: data.name.trim(),
    email: data.email.trim(),
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  };

  const repositories = await getRepositoryContext();
  await repositories.employees.insert(employee);

  return employee;
}

export async function updateEmployee(
  tenantId: string,
  employeeId: string,
  data: {
    employeeCode?: string;
    name?: string;
    email?: string;
    status?: "active" | "inactive";
  },
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.employees.findById(employeeId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  const updates: Partial<typeof existing> = {};
  if (data.employeeCode !== undefined) updates.employeeCode = data.employeeCode.trim();
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.email !== undefined) updates.email = data.email.trim();
  if (data.status !== undefined) updates.status = data.status;
  updates.updatedAt = new Date().toISOString();

  return repositories.employees.update(employeeId, updates);
}

export async function disableEmployee(
  tenantId: string,
  employeeId: string,
) {
  const repositories = await getRepositoryContext();
  const existing = await repositories.employees.findById(employeeId);

  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  return repositories.employees.update(employeeId, {
    status: "inactive",
    updatedAt: new Date().toISOString(),
  });
}
