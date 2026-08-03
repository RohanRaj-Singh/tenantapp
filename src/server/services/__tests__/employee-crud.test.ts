import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  disableEmployee,
  registerEmployee,
  suspendEmployee,
  unsuspendEmployee,
  archiveEmployee,
  archiveEmployeeById,
  loginEmployee,
} from "@/src/server/services/employeeService";
import { getRepositoryContext } from "@/src/server/repositories/context";

const TENANT_ID = "tenant-crud-test";
const OTHER_TENANT = "tenant-other-crud";

// ── Create ──────────────────────────────────────────────────────────────────

describe("Employee CRUD — Create", () => {
  it("creates an employee with not_registered status and generated ID", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-001",
      email: "alice@example.com",
    });

    assert.ok(emp.employeeId.startsWith("emp_"), `Expected employeeId to start with 'emp_', got ${emp.employeeId}`);
    assert.equal(emp.tenantId, TENANT_ID);
    assert.equal(emp.employeeCode, "EMP-001");
    assert.equal(emp.email, "alice@example.com");
    assert.equal(emp.status, "not_registered");
    assert.equal(emp.failedLoginAttempts, 0);
    assert.equal(emp.lockedUntil, null);
    assert.equal(emp.lastAccessAt, null);
  });

  it("sets passwordHash to null", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-NULLPW",
      email: "nullpw@example.com",
    });
    assert.equal(emp.passwordHash, null);
  });

  it("sets name to null", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-NONAME",
      email: "noname@example.com",
    });
    assert.equal(emp.name, null);
  });

  it("accepts only employeeCode and email as input", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-MIN",
      email: "min@example.com",
    });
    assert.ok(emp.employeeId, "Expected employee to be created");
    assert.equal(emp.status, "not_registered");
  });

  it("trims whitespace from employeeCode and email", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "  EMP-TRIM  ",
      email: "  trim@example.com  ",
    });
    assert.equal(emp.employeeCode, "EMP-TRIM");
    assert.equal(emp.email, "trim@example.com");
  });
});

// ── Read ────────────────────────────────────────────────────────────────────

describe("Employee CRUD — Read", () => {
  it("finds an employee by ID within the correct tenant", async () => {
    const created = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-READ-001",
      email: "dave@example.com",
    });

    const found = await getEmployee(created.employeeId, TENANT_ID);
    assert.ok(found, "Expected to find employee");
    assert.equal(found!.employeeId, created.employeeId);
    assert.equal(found!.employeeCode, "EMP-READ-001");
  });

  it("returns null for a cross-tenant lookup", async () => {
    const created = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-READ-002",
      email: "eve@example.com",
    });

    const result = await getEmployee(created.employeeId, OTHER_TENANT);
    assert.equal(result, null, "Cross-tenant lookup must return null");
  });

  it("returns null for a non-existent ID", async () => {
    const result = await getEmployee("emp_does_not_exist", TENANT_ID);
    assert.equal(result, null);
  });

  it("lists employees for a tenant with pagination", async () => {
    const subTenant = "tenant-crud-list-paging";
    await createEmployee(subTenant, { employeeCode: "L-001", email: "l1@t.com" });
    await createEmployee(subTenant, { employeeCode: "L-002", email: "l2@t.com" });
    await createEmployee(subTenant, { employeeCode: "L-003", email: "l3@t.com" });

    const page1 = await listEmployees(subTenant, { skip: 0, limit: 2 });
    assert.equal(page1.total, 3, "Expected 3 total employees");
    assert.equal(page1.employees.length, 2, "First page should have 2 employees");

    const page2 = await listEmployees(subTenant, { skip: 2, limit: 2 });
    assert.equal(page2.employees.length, 1, "Second page should have 1 employee");
  });

  it("searches employees by employeeCode", async () => {
    const subTenant = "tenant-crud-search-code";
    await createEmployee(subTenant, { employeeCode: "SRCH-001", email: "z@t.com" });
    await createEmployee(subTenant, { employeeCode: "SRCH-002", email: "n@t.com" });

    const byCode = await listEmployees(subTenant, { search: "SRCH-002" });
    assert.equal(byCode.total, 1);
    assert.equal(byCode.employees[0]!.employeeCode, "SRCH-002");

    const noMatch = await listEmployees(subTenant, { search: "XYZ_NO_MATCH" });
    assert.equal(noMatch.total, 0);
  });

  it("searches employees by email", async () => {
    const subTenant = "tenant-crud-search-email";
    await createEmployee(subTenant, { employeeCode: "EMAIL-001", email: "unique-val@test.com" });
    await createEmployee(subTenant, { employeeCode: "EMAIL-002", email: "other@test.com" });

    const byEmail = await listEmployees(subTenant, { search: "unique-val" });
    assert.equal(byEmail.total, 1);
    assert.equal(byEmail.employees[0]!.email, "unique-val@test.com");
  });

  it("never exposes passwordHash in listEmployees results", async () => {
    const subTenant = "tenant-crud-nohash";
    await createEmployee(subTenant, { employeeCode: "NH-001", email: "s@t.com" });

    const { employees } = await listEmployees(subTenant);
    for (const emp of employees) {
      assert.ok(!("passwordHash" in emp), "passwordHash must not appear in listEmployees result");
    }
  });
});

// ── Visibility Filtering ──────────────────────────────────────────────────────

describe("Employee CRUD — Visibility Filtering", () => {
  it("listEmployees strips name for tenant_admin caller", async () => {
    const subTenant = "tenant-vis-list-ta";
    await createEmployee(subTenant, { employeeCode: "VIS-TA-001", email: "vista1@test.com" });

    const { employees } = await listEmployees(subTenant, {}, "tenant_admin");
    for (const emp of employees) {
      assert.equal(emp.name, undefined, "name must not be present for tenant_admin");
    }
  });

  it("listEmployees includes name for super_admin caller", async () => {
    const subTenant = "tenant-vis-list-sa";
    await createEmployee(subTenant, { employeeCode: "VIS-SA-001", email: "vissa1@test.com" });

    const { employees } = await listEmployees(subTenant, {}, "super_admin");
    for (const emp of employees) {
      // For unregistered employees, name is null, but the property must exist
      assert.ok("name" in emp, "name field must be present for super_admin");
    }
  });

  it("getEmployee strips name for tenant_admin caller", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "VIS-GET-TA",
      email: "visgetta@test.com",
    });

    const result = await getEmployee(emp.employeeId, TENANT_ID, "tenant_admin");
    assert.ok(result, "Expected employee");
    assert.equal(result.name, undefined, "name must not be present for tenant_admin");
  });

  it("getEmployee includes name for super_admin caller", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "VIS-GET-SA",
      email: "visgetsa@test.com",
    });

    const result = await getEmployee(emp.employeeId, TENANT_ID, "super_admin");
    assert.ok(result, "Expected employee");
    assert.ok("name" in result!, "name field must be present for super_admin");
  });
});

// ── Update ──────────────────────────────────────────────────────────────────

describe("Employee CRUD — Update", () => {
  it("updates employee fields and bumps updatedAt", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-UPD-001",
      email: "frank@example.com",
    });
    const originalUpdatedAt = emp.updatedAt;

    await new Promise((r) => setTimeout(r, 5));

    const updated = await updateEmployee(TENANT_ID, emp.employeeId, {
      email: "frank-new@example.com",
    });

    assert.ok(updated, "Expected updated employee");
    assert.equal(updated!.email, "frank-new@example.com");
    assert.ok(
      updated!.updatedAt > originalUpdatedAt,
      "updatedAt must be later than original",
    );
  });

  it("returns null when updating an employee from another tenant", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-UPD-002",
      email: "grace@example.com",
    });

    const result = await updateEmployee(OTHER_TENANT, emp.employeeId, { email: "hijacked@test.com" });
    assert.equal(result, null, "Cross-tenant update must return null");

    // Original must be unchanged
    const ctx = await getRepositoryContext();
    const original = await ctx.employees.findById(emp.employeeId);
    assert.equal(original!.email, "grace@example.com");
  });
});

// ── Disable ─────────────────────────────────────────────────────────────────

describe("Employee CRUD — Disable", () => {
  it("sets status to inactive", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-DIS-001",
      email: "henry@example.com",
    });

    const disabled = await disableEmployee(TENANT_ID, emp.employeeId);
    assert.ok(disabled, "Expected a result");
    assert.equal(disabled!.status, "inactive");
  });

  it("returns null when disabling from another tenant", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-DIS-002",
      email: "iris@example.com",
    });

    const result = await disableEmployee(OTHER_TENANT, emp.employeeId);
    assert.equal(result, null);
  });
});

// ── Registration ──────────────────────────────────────────────────────────────

describe("Employee CRUD — Registration", () => {
  it("registerEmployee sets status to active", async () => {
    const subTenant = "tenant-reg-status";
    await createEmployee(subTenant, { employeeCode: "REG-STATUS", email: "reg-status@test.com" });

    const result = await registerEmployee(subTenant, "REG-STATUS", "reg-status@test.com", "ValidPass1", "Reg Status");
    assert.equal(result.status, "active");
  });

  it("registerEmployee sets name from input", async () => {
    const subTenant = "tenant-reg-name";
    await createEmployee(subTenant, { employeeCode: "REG-NAME", email: "reg-name@test.com" });

    const result = await registerEmployee(subTenant, "REG-NAME", "reg-name@test.com", "ValidPass1", "Registered Name");
    assert.equal(result.name, "Registered Name");
  });

  it("registerEmployee sets passwordHash (verifiable by login)", async () => {
    const subTenant = "tenant-reg-pw";
    await createEmployee(subTenant, { employeeCode: "REG-PW", email: "reg-pw@test.com" });

    await registerEmployee(subTenant, "REG-PW", "reg-pw@test.com", "ValidPass1", "Reg PW");

    // Verify login works
    const { loginEmployee } = await import("@/src/server/services/employeeService");
    const loginResult = await loginEmployee(subTenant, "reg-pw@test.com", "ValidPass1");
    assert.ok(loginResult.success, "Login should succeed after registration");
  });

  it("returns SafeEmployee without passwordHash", async () => {
    const subTenant = "tenant-reg-safe";
    await createEmployee(subTenant, { employeeCode: "REG-SAFE", email: "reg-safe@test.com" });

    const result = await registerEmployee(subTenant, "REG-SAFE", "reg-safe@test.com", "ValidPass1", "Reg Safe");
    assert.ok(!("passwordHash" in result), "passwordHash must not be in SafeEmployee");
  });

  it("rejects already registered employee", async () => {
    const subTenant = "tenant-reg-already";
    await createEmployee(subTenant, { employeeCode: "REG-DONE", email: "reg-done@test.com" });
    await registerEmployee(subTenant, "REG-DONE", "reg-done@test.com", "ValidPass1", "Reg Done");

    await assert.rejects(
      () => registerEmployee(subTenant, "REG-DONE", "reg-done@test.com", "Another1", "Again"),
      { message: "This account has already been registered." },
    );
  });

  it("rejects wrong email", async () => {
    const subTenant = "tenant-reg-email";
    await createEmployee(subTenant, { employeeCode: "REG-EM", email: "correct@test.com" });

    await assert.rejects(
      () => registerEmployee(subTenant, "REG-EM", "wrong@test.com", "ValidPass1", "Wrong Email"),
      { message: "Email does not match our records." },
    );
  });

  it("rejects inactive employee", async () => {
    const subTenant = "tenant-reg-inactive";
    const emp = await createEmployee(subTenant, { employeeCode: "REG-INACT", email: "reg-inact@test.com" });
    await disableEmployee(subTenant, emp.employeeId);

    await assert.rejects(
      () => registerEmployee(subTenant, "REG-INACT", "reg-inact@test.com", "ValidPass1", "Inactive"),
      { message: "This account is not available for registration." },
    );
  });

  it("rejects suspended employee", async () => {
    const subTenant = "tenant-reg-suspended";
    const emp = await createEmployee(subTenant, { employeeCode: "REG-SUSP", email: "reg-susp@test.com" });
    await suspendEmployee(subTenant, emp.employeeId);

    await assert.rejects(
      () => registerEmployee(subTenant, "REG-SUSP", "reg-susp@test.com", "ValidPass1", "Suspended"),
      { message: "This account is not available for registration." },
    );
  });

  it("rejects empty name", async () => {
    const subTenant = "tenant-reg-empty-name";
    await createEmployee(subTenant, { employeeCode: "REG-NONAME", email: "reg-noname@test.com" });

    await assert.rejects(
      () => registerEmployee(subTenant, "REG-NONAME", "reg-noname@test.com", "ValidPass1", ""),
      { message: "Name is required." },
    );
  });
});

// ── Status Transitions (Super Admin) ──────────────────────────────────────────

describe("Employee CRUD — Status Transitions", () => {
  it("suspendEmployee sets status to suspended", async () => {
    const subTenant = "tenant-trans-suspend";
    const emp = await createEmployee(subTenant, { employeeCode: "SUSP-001", email: "susp@test.com" });

    const result = await suspendEmployee(subTenant, emp.employeeId);
    assert.ok(result, "Expected suspend result");
    assert.equal(result!.status, "suspended");
  });

  it("unsuspendEmployee sets status back to active", async () => {
    const subTenant = "tenant-trans-unsuspend";
    const emp = await createEmployee(subTenant, { employeeCode: "UNSUSP", email: "unsusp@test.com" });
    await suspendEmployee(subTenant, emp.employeeId);

    const result = await unsuspendEmployee(subTenant, emp.employeeId);
    assert.ok(result, "Expected unsuspend result");
    assert.equal(result!.status, "active");
  });

  it("suspendEmployee returns null for cross-tenant", async () => {
    const emp = await createEmployee(TENANT_ID, { employeeCode: "SUSP-X", email: "susp-x@test.com" });
    const result = await suspendEmployee(OTHER_TENANT, emp.employeeId);
    assert.equal(result, null);
  });

  it("unsuspendEmployee returns null for cross-tenant", async () => {
    const emp = await createEmployee(TENANT_ID, { employeeCode: "UNSUSP-X", email: "unsusp-x@test.com" });
    const result = await unsuspendEmployee(OTHER_TENANT, emp.employeeId);
    assert.equal(result, null);
  });

  it("archiveEmployee sets status to archived", async () => {
    const subTenant = "tenant-trans-archive";
    const emp = await createEmployee(subTenant, { employeeCode: "ARCH-001", email: "arch@test.com" });

    const result = await archiveEmployee(subTenant, emp.employeeId);
    assert.ok(result, "Expected archive result");
    assert.equal(result!.status, "archived");
  });

  it("archiveEmployeeById works cross-tenant (resolves tenantId internally)", async () => {
    const subTenant = "tenant-trans-archive-by-id";
    const emp = await createEmployee(subTenant, { employeeCode: "ARCH-002", email: "arch2@test.com" });

    const result = await archiveEmployeeById(emp.employeeId);
    assert.ok(result, "Expected archive-by-id result");
    assert.equal(result!.status, "archived");
    assert.equal(result!.tenantId, subTenant);
  });

  it("archiveEmployee returns null for cross-tenant", async () => {
    const emp = await createEmployee(TENANT_ID, { employeeCode: "ARCH-X", email: "arch-x@test.com" });
    const result = await archiveEmployee(OTHER_TENANT, emp.employeeId);
    assert.equal(result, null);
  });

  it("archived employee cannot log in (mirrors suspended)", async () => {
    const subTenant = "tenant-trans-archive-login";
    const emp = await createEmployee(subTenant, { employeeCode: "ARCH-LOGIN", email: "arch-login@test.com" });
    await registerEmployee(subTenant, "ARCH-LOGIN", "arch-login@test.com", "ValidPass1", "Arch Login");
    await archiveEmployee(subTenant, emp.employeeId);

    const result = await loginEmployee(subTenant, "arch-login@test.com", "ValidPass1");
    assert.equal(result.success, false);
    assert.equal(result.errorCode, "EMPLOYEE_ARCHIVED");
  });

  it("archived employee cannot be registered", async () => {
    const subTenant = "tenant-trans-archive-reg";
    const emp = await createEmployee(subTenant, { employeeCode: "ARCH-REG", email: "arch-reg@test.com" });
    await archiveEmployee(subTenant, emp.employeeId);

    await assert.rejects(
      () => registerEmployee(subTenant, "ARCH-REG", "arch-reg@test.com", "ValidPass1", "Archived Reg"),
      { message: "This account is not available for registration." },
    );
  });
});
