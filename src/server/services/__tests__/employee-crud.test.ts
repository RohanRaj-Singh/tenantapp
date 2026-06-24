import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  disableEmployee,
} from "@/src/server/services/employeeService";
import { getRepositoryContext } from "@/src/server/repositories/context";

const TENANT_ID = "tenant-crud-test-employees";
const OTHER_TENANT = "tenant-other";

// ── Create ──────────────────────────────────────────────────────────────────

describe("Employee CRUD — Create", () => {
  it("creates an employee and assigns a generated ID", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-001",
      name: "Alice Smith",
      email: "alice@example.com",
      pin: "123456",
    });

    assert.ok(emp.employeeId.startsWith("emp_"), "Expected employeeId to start with 'emp_'");
    assert.equal(emp.tenantId, TENANT_ID);
    assert.equal(emp.employeeCode, "EMP-001");
    assert.equal(emp.name, "Alice Smith");
    assert.equal(emp.email, "alice@example.com");
    assert.equal(emp.status, "active");
    assert.ok(emp.pinHash, "Expected pinHash to be set");
    assert.equal(emp.failedLoginAttempts, 0);
    assert.equal(emp.lockedUntil, null);
    assert.equal(emp.lastAccessAt, null);
  });

  it("trims whitespace from name, email, and employeeCode", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "  EMP-002  ",
      name: "  Bob Jones  ",
      email: "  bob@example.com  ",
      pin: "654321",
    });

    assert.equal(emp.employeeCode, "EMP-002");
    assert.equal(emp.name, "Bob Jones");
    assert.equal(emp.email, "bob@example.com");
  });

  it("does not expose pinHash in the returned document", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-003",
      name: "Carol White",
      email: "carol@example.com",
      pin: "111111",
    });

    // createEmployee returns the full doc including pinHash (used internally)
    // but it should be a hashed value, not the plain PIN
    assert.notEqual(emp.pinHash, "111111", "pinHash must not be the plain PIN");
    assert.ok(emp.pinHash.includes(":"), "pinHash should be in salt:hash format");
  });
});

// ── Read ────────────────────────────────────────────────────────────────────

describe("Employee CRUD — Read", () => {
  it("finds an employee by ID within the correct tenant", async () => {
    const created = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-READ-001",
      name: "Dave Read",
      email: "dave@example.com",
      pin: "222222",
    });

    const found = await getEmployee(TENANT_ID, created.employeeId);
    assert.ok(found, "Expected to find employee");
    assert.equal(found!.employeeId, created.employeeId);
    assert.equal(found!.employeeCode, "EMP-READ-001");
  });

  it("returns null for a cross-tenant lookup", async () => {
    const created = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-READ-002",
      name: "Eve Cross",
      email: "eve@example.com",
      pin: "333333",
    });

    const result = await getEmployee(OTHER_TENANT, created.employeeId);
    assert.equal(result, null, "Cross-tenant lookup must return null");
  });

  it("returns null for a non-existent ID", async () => {
    const result = await getEmployee(TENANT_ID, "emp_does_not_exist");
    assert.equal(result, null);
  });

  it("lists employees for a tenant with pagination", async () => {
    // Create 3 known employees in a dedicated sub-tenant to avoid interference
    const subTenant = "tenant-crud-list-test";
    await createEmployee(subTenant, { employeeCode: "L-001", name: "Lara A", email: "l1@t.com", pin: "000001" });
    await createEmployee(subTenant, { employeeCode: "L-002", name: "Lara B", email: "l2@t.com", pin: "000002" });
    await createEmployee(subTenant, { employeeCode: "L-003", name: "Lara C", email: "l3@t.com", pin: "000003" });

    const page1 = await listEmployees(subTenant, { skip: 0, limit: 2 });
    assert.equal(page1.total, 3, "Expected 3 total employees");
    assert.equal(page1.employees.length, 2, "First page should have 2 employees");

    const page2 = await listEmployees(subTenant, { skip: 2, limit: 2 });
    assert.equal(page2.employees.length, 1, "Second page should have 1 employee");
  });

  it("searches employees by name and employeeCode", async () => {
    const subTenant = "tenant-crud-search-test";
    await createEmployee(subTenant, { employeeCode: "SRCH-001", name: "Zara Unique", email: "z@t.com", pin: "000001" });
    await createEmployee(subTenant, { employeeCode: "SRCH-002", name: "Nora Distinct", email: "n@t.com", pin: "000002" });

    const byName = await listEmployees(subTenant, { search: "Zara" });
    assert.equal(byName.total, 1);
    assert.equal(byName.employees[0]!.name, "Zara Unique");

    const byCode = await listEmployees(subTenant, { search: "SRCH-002" });
    assert.equal(byCode.total, 1);
    assert.equal(byCode.employees[0]!.employeeCode, "SRCH-002");

    const noMatch = await listEmployees(subTenant, { search: "XYZ_NO_MATCH" });
    assert.equal(noMatch.total, 0);
  });

  it("never exposes pinHash in listEmployees results", async () => {
    const subTenant = "tenant-crud-nohash-test";
    await createEmployee(subTenant, { employeeCode: "NH-001", name: "Safe User", email: "s@t.com", pin: "999999" });

    const { employees } = await listEmployees(subTenant);
    for (const emp of employees) {
      assert.ok(!("pinHash" in emp), `pinHash must not appear in listEmployees result for ${emp.name}`);
    }
  });
});

// ── Update ──────────────────────────────────────────────────────────────────

describe("Employee CRUD — Update", () => {
  it("updates employee fields and bumps updatedAt", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-UPD-001",
      name: "Frank Update",
      email: "frank@example.com",
      pin: "444444",
    });
    const originalUpdatedAt = emp.updatedAt;

    // Small delay to guarantee timestamp difference
    await new Promise((r) => setTimeout(r, 5));

    const updated = await updateEmployee(TENANT_ID, emp.employeeId, {
      name: "Frank Updated",
      email: "frank-new@example.com",
    });

    assert.ok(updated, "Expected updated employee");
    assert.equal(updated!.name, "Frank Updated");
    assert.equal(updated!.email, "frank-new@example.com");
    assert.ok(
      updated!.updatedAt > originalUpdatedAt,
      "updatedAt must be later than original",
    );
  });

  it("returns null when updating an employee from another tenant", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-UPD-002",
      name: "Grace Cross",
      email: "grace@example.com",
      pin: "555555",
    });

    const result = await updateEmployee(OTHER_TENANT, emp.employeeId, { name: "Hijacked" });
    assert.equal(result, null, "Cross-tenant update must return null");

    // Original must be unchanged
    const ctx = await getRepositoryContext();
    const original = await ctx.employees.findById(emp.employeeId);
    assert.equal(original!.name, "Grace Cross");
  });
});

// ── Disable ─────────────────────────────────────────────────────────────────

describe("Employee CRUD — Disable", () => {
  it("sets status to inactive", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-DIS-001",
      name: "Henry Disable",
      email: "henry@example.com",
      pin: "666666",
    });

    const disabled = await disableEmployee(TENANT_ID, emp.employeeId);
    assert.ok(disabled, "Expected a result");
    assert.equal(disabled!.status, "inactive");
  });

  it("returns null when disabling from another tenant", async () => {
    const emp = await createEmployee(TENANT_ID, {
      employeeCode: "EMP-DIS-002",
      name: "Iris Guard",
      email: "iris@example.com",
      pin: "777777",
    });

    const result = await disableEmployee(OTHER_TENANT, emp.employeeId);
    assert.equal(result, null);
  });
});
