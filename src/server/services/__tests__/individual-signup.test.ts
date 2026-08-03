import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  registerIndividual,
  loginEmployee,
} from "@/src/server/services/employeeService";
import {
  createReimbursement,
  listReimbursements,
} from "@/src/server/services/reimbursementService";
import { getBudgetOverview, setBudget } from "@/src/server/services/budgetService";
import { getRepositoryContext } from "@/src/server/repositories/context";
import {
  INDIVIDUAL_TENANT_ID,
  INDIVIDUAL_TENANT_SLUG,
} from "@/src/server/constants/individual";

const STRONG_PASSWORD = "Password123";

/**
 * Individual (public) sign-up flow — FR-079, FR-082.
 *
 * Individuals are ordinary employees of the reserved sentinel tenant
 * `tenant-individual`, so they reuse the whole register → login → claim
 * pipeline. These tests cover registration, enumeration-safe duplicate
 * rejection, login, claim submission, and — critically — isolation from
 * real org budgets.
 */
describe("Individual Sign-Up — Registration", () => {
  it("registers an individual under the sentinel tenant with an auto-generated code", async () => {
    const email = "ada.lovelace@example.com";

    const employee = await registerIndividual(
      email,
      STRONG_PASSWORD,
      "Ada Lovelace",
      "+96890000000",
      "1234567890",
      "Bank Muscat",
    );

    assert.equal(employee.tenantId, INDIVIDUAL_TENANT_ID);
    assert.equal(employee.email, email.toLowerCase());
    assert.equal(employee.name, "Ada Lovelace");
    assert.equal(employee.status, "active");
    assert.equal(employee.mustChangePassword, false);
    assert.ok(
      employee.employeeCode.startsWith("IND-"),
      `Expected an auto-generated IND- code, got ${employee.employeeCode}`,
    );
    // Safe projection must never leak the password hash.
    assert.equal(
      (employee as unknown as Record<string, unknown>).passwordHash,
      undefined,
      "SafeEmployee must not expose passwordHash",
    );
  });

  it("normalises the email to lowercase before storing", async () => {
    const employee = await registerIndividual(
      "MixedCase@Example.com",
      STRONG_PASSWORD,
      "Grace Hopper",
    );

    assert.equal(employee.email, "mixedcase@example.com");
  });

  it("rejects a duplicate email within the sentinel tenant (enumeration-safe)", async () => {
    const email = "duplicate@example.com";
    await registerIndividual(email, STRONG_PASSWORD, "First Person");

    await assert.rejects(
      () => registerIndividual(email, STRONG_PASSWORD, "Second Person"),
      (error: Error) => {
        assert.match(error.message, /already registered/i);
        // Must NOT reveal which account exists beyond the generic message.
        assert.doesNotMatch(error.message, /First Person/);
        return true;
      },
    );
  });

  it("rejects a weak password", async () => {
    await assert.rejects(
      () => registerIndividual("weakpass@example.com", "weak", "Weak Password"),
    );
  });

  it("rejects a missing name", async () => {
    await assert.rejects(
      () => registerIndividual("noname@example.com", STRONG_PASSWORD, "   "),
    );
  });
});

describe("Individual Sign-Up — Login", () => {
  it("logs in an individual against the sentinel tenant", async () => {
    const email = "login.test@example.com";
    await registerIndividual(email, STRONG_PASSWORD, "Login Tester");

    const result = await loginEmployee(INDIVIDUAL_TENANT_ID, email, STRONG_PASSWORD);

    assert.equal(result.success, true);
    assert.equal(result.employee?.tenantId, INDIVIDUAL_TENANT_ID);
    assert.equal(result.employee?.email, email);
    // Individuals set their password at registration — no forced change.
    assert.notEqual(result.mustChangePassword, true);
  });

  it("resolves the sentinel tenant by its slug", async () => {
    const repositories = await getRepositoryContext();
    const tenant = await repositories.tenants.findBySlug(INDIVIDUAL_TENANT_SLUG);

    assert.ok(tenant, "Sentinel tenant must be resolvable by slug for login");
    assert.equal(tenant?.tenantId, INDIVIDUAL_TENANT_ID);
    assert.equal(tenant?.status, "active");
  });

  it("rejects an invalid password", async () => {
    const email = "wrongpw@example.com";
    await registerIndividual(email, STRONG_PASSWORD, "Wrong PW");

    const result = await loginEmployee(INDIVIDUAL_TENANT_ID, email, "WrongPassword9");

    assert.equal(result.success, false);
    assert.equal(result.errorCode, "INVALID_PASSWORD");
  });
});

describe("Individual Sign-Up — Claims", () => {
  it("submits and retrieves a claim under the sentinel tenant", async () => {
    const email = "claimant@example.com";
    const employee = await registerIndividual(email, STRONG_PASSWORD, "Claimant One");

    const claim = await createReimbursement(INDIVIDUAL_TENANT_ID, {
      employeeId: employee.employeeId,
      employeeName: employee.name ?? "Claimant One",
      type: "therapy",
      amount: 150,
      description: "Personal counselling session",
    });

    assert.equal(claim.tenantId, INDIVIDUAL_TENANT_ID);
    assert.equal(claim.status, "pending");

    const list = await listReimbursements(INDIVIDUAL_TENANT_ID);
    const found = list.reimbursements.find(
      (r) => r.reimbursementId === claim.reimbursementId,
    );
    assert.ok(found, "Individual claim must be retrievable under the sentinel tenant");
  });

  it("excludes individual claims from a real org's budget aggregation", async () => {
    const orgTenant = "tenant-isolation-check";
    const year = new Date().getFullYear();
    await setBudget(orgTenant, year, 10_000, "admin-isolation-test");

    // Baseline: the org has no reserved budget yet.
    const before = await getBudgetOverview(orgTenant, year);
    assert.equal(before.reservedAmount, 0);

    // An individual submits a pending claim — this would reserve budget IF it
    // were attributed to the org.
    const employee = await registerIndividual(
      "isolation@example.com",
      STRONG_PASSWORD,
      "Isolation Tester",
    );
    await createReimbursement(INDIVIDUAL_TENANT_ID, {
      employeeId: employee.employeeId,
      employeeName: employee.name ?? "Isolation Tester",
      type: "therapy",
      amount: 500,
      description: "Personal claim that must not touch the org budget",
    });

    // The org's budget is untouched — aggregation matches an exact tenantId,
    // so the sentinel tenant is naturally isolated.
    const after = await getBudgetOverview(orgTenant, year);
    assert.equal(
      after.reservedAmount,
      0,
      "Individual claims must never reserve a real org's budget",
    );
    assert.equal(after.availableAmount, 10_000);
  });
});
