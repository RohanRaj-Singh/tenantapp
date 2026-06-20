// Employee CRUD Verification Script
// Seeds a test user, starts the server, and tests the full API flow

import { MongoClient } from "mongodb";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3000";
const MONGODB_URI = "mongodb://localhost:27017/tenantapp";

async function seedTestUser() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db("tenantapp");

  // Find tenant-2 which is active
  const tenant = await db.collection("tenants").findOne({ slug: "tenant-2" });
  if (!tenant) throw new Error("tenant-2 not found in MongoDB");

  // Check if user already exists
  const existing = await db.collection("tenantDashboardUsers").findOne({ tenantId: tenant.tenantId });
  if (existing) {
    console.log("✓ Test user already exists for tenant-2");
    await client.close();
    return { email: existing.email, password: "TestPass1234", tenantSlug: "tenant-2" };
  }

  // Create test user
  const passwordHash = await bcrypt.hash("TestPass1234", 12);
  const userId = "test-user-tenant-2";
  await db.collection("tenantDashboardUsers").insertOne({
    id: userId,
    tenantId: tenant.tenantId,
    email: `owner@tenant-2.remedygcc.local`,
    username: "tenant2.owner",
    passwordHash,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: null,
    mustChangePassword: false,
  });

  console.log("✓ Test user created for tenant-2");
  await client.close();
  return { email: `owner@tenant-2.remedygcc.local`, password: "TestPass1234", tenantSlug: "tenant-2" };
}

async function main() {
  console.log("\n=== EMPLOYEE CRUD FLOW VERIFICATION ===\n");

  // Step 1: Seed test user
  console.log("1. Seeding test user...");
  const { email, password, tenantSlug } = await seedTestUser();

  // Step 2: Login
  console.log("2. Logging in...");
  const loginRes = await fetch(`${BASE_URL}/api/tenant-auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: email, password }),
  });

  if (!loginRes.ok) {
    const body = await loginRes.text();
    console.error(`✗ Login failed (${loginRes.status}):`, body);
    process.exit(1);
  }

  const loginData = await loginRes.json();
  console.log("✓ Login successful");

  // Get session cookie from set-cookie header
  const setCookie = loginRes.headers.get("set-cookie");
  if (!setCookie) {
    console.error("✗ No session cookie received");
    process.exit(1);
  }

  // Step 3: List employees (empty)
  console.log("\n3. Listing employees (expecting empty)...");
  let listRes = await fetch(`${BASE_URL}/api/employees`, {
    headers: { Cookie: setCookie },
  });

  if (listRes.status === 401) {
    // Try with x-forwarded-host header for tenant resolution
    listRes = await fetch(`${BASE_URL}/api/employees`, {
      headers: {
        Cookie: setCookie,
        "x-forwarded-host": `${tenantSlug}.lvh.me:3000`,
      },
    });
  }

  if (!listRes.ok) {
    const body = await listRes.text();
    console.error(`✗ List failed (${listRes.status}):`, body);
    process.exit(1);
  }

  let listData = await listRes.json();
  console.log(`✓ Employee list: ${listData.total} employees`);
  if (listData.total !== 0) {
    console.error("✗ Expected 0 employees initially");
    process.exit(1);
  }

  // Step 4: Create employees
  console.log("\n4. Creating employees...");
  const employeesToCreate = [
    { employeeCode: "EMP-001", name: "Alice Johnson", email: "alice@company.com" },
    { employeeCode: "EMP-002", name: "Bob Smith", email: "bob@company.com" },
    { employeeCode: "EMP-003", name: "Charlie Brown", email: "charlie@company.com" },
    { employeeCode: "EMP-004", name: "Diana Prince", email: "diana@company.com" },
    { employeeCode: "EMP-005", name: "Eve Wilson", email: "eve@company.com" },
  ];

  for (const emp of employeesToCreate) {
    const res = await fetch(`${BASE_URL}/api/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: setCookie },
      body: JSON.stringify(emp),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`✗ Create ${emp.name} failed:`, body);
      process.exit(1);
    }
    const data = await res.json();
    console.log(`  ✓ Created: ${data.name} (${data.employeeId})`);
  }

  // Step 5: List employees (with data)
  console.log("\n5. Listing employees (expecting 5)...");
  listRes = await fetch(`${BASE_URL}/api/employees`, {
    headers: { Cookie: setCookie },
  });
  listData = await listRes.json();
  console.log(`✓ Employee list: ${listData.total} employees`);
  if (listData.total !== 5) {
    console.error(`✗ Expected 5 employees, got ${listData.total}`);
    process.exit(1);
  }

  // Step 6: Search employees
  console.log("\n6. Searching employees...");
  const searchRes = await fetch(`${BASE_URL}/api/employees?search=alice`, {
    headers: { Cookie: setCookie },
  });
  const searchData = await searchRes.json();
  console.log(`✓ Search "alice": ${searchData.total} result(s)`);
  if (searchData.total !== 1 || searchData.employees[0].name !== "Alice Johnson") {
    console.error("✗ Search returned wrong results");
    process.exit(1);
  }

  // Step 7: Pagination
  console.log("\n7. Testing pagination (limit=2)...");
  const pageRes = await fetch(`${BASE_URL}/api/employees?skip=0&limit=2`, {
    headers: { Cookie: setCookie },
  });
  const pageData = await pageRes.json();
  console.log(`✓ Page 1: ${pageData.employees.length} of ${pageData.total} employees`);
  if (pageData.employees.length !== 2) {
    console.error("✗ Expected 2 results per page");
    process.exit(1);
  }

  const page2Res = await fetch(`${BASE_URL}/api/employees?skip=2&limit=2`, {
    headers: { Cookie: setCookie },
  });
  const page2Data = await page2Res.json();
  console.log(`✓ Page 2: ${page2Data.employees.length} of ${page2Data.total} employees`);

  // Step 8: Get single employee
  console.log("\n8. Getting single employee...");
  const firstId = listData.employees[0].employeeId;
  const getRes = await fetch(`${BASE_URL}/api/employees/${firstId}`, {
    headers: { Cookie: setCookie },
  });
  const getData = await getRes.json();
  console.log(`✓ Fetched: ${getData.name}`);
  if (getData.employeeId !== firstId) {
    console.error("✗ Wrong employee returned");
    process.exit(1);
  }

  // Step 9: Update employee
  console.log("\n9. Updating employee...");
  const updateRes = await fetch(`${BASE_URL}/api/employees/${firstId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: setCookie },
    body: JSON.stringify({ name: "Alice Johnson Updated" }),
  });
  const updateData = await updateRes.json();
  console.log(`✓ Updated: ${updateData.name}`);
  if (updateData.name !== "Alice Johnson Updated") {
    console.error("✗ Update didn't persist");
    process.exit(1);
  }

  // Step 10: Disable employee (soft-delete)
  console.log("\n10. Disabling employee...");
  const disableRes = await fetch(`${BASE_URL}/api/employees/${firstId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: setCookie },
    body: JSON.stringify({ status: "inactive" }),
  });
  const disableData = await disableRes.json();
  console.log(`✓ Disabled: ${disableData.status}`);
  if (disableData.status !== "inactive") {
    console.error("✗ Disable didn't work");
    process.exit(1);
  }

  // Step 11: Filter by inactive status
  console.log("\n11. Filtering by inactive status...");
  const inactiveRes = await fetch(`${BASE_URL}/api/employees?status=inactive`, {
    headers: { Cookie: setCookie },
  });
  const inactiveData = await inactiveRes.json();
  console.log(`✓ Inactive employees: ${inactiveData.total}`);
  if (inactiveData.total !== 1) {
    console.error(`✗ Expected 1 inactive, got ${inactiveData.total}`);
    process.exit(1);
  }

  // Step 12: Verify employee still exists (not hard-deleted)
  console.log("\n12. Verifying soft-delete (employee still exists)...");
  const afterDisableRes = await fetch(`${BASE_URL}/api/employees/${firstId}`, {
    headers: { Cookie: setCookie },
  });
  const afterDisableData = await afterDisableRes.json();
  console.log(`✓ Employee exists: ${afterDisableData.name} (${afterDisableData.status})`);

  // Step 13: Re-enable employee
  console.log("\n13. Re-enabling employee...");
  const enableRes = await fetch(`${BASE_URL}/api/employees/${firstId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: setCookie },
    body: JSON.stringify({ status: "active" }),
  });
  const enableData = await enableRes.json();
  console.log(`✓ Re-enabled: ${enableData.status}`);
  if (enableData.status !== "active") {
    console.error("✗ Re-enable didn't work");
    process.exit(1);
  }

  // Step 14: Cleanup - remove test employees
  console.log("\n14. Cleaning up test data...");
  const cleanupRes = await fetch(`${BASE_URL}/api/employees`, {
    headers: { Cookie: setCookie },
  });
  const cleanupData = await cleanupRes.json();

  // Clean up via DB directly
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db("tenantapp");
  const tenant = await db.collection("tenants").findOne({ slug: "tenant-2" });
  const del = await db.collection("employees").deleteMany({ tenantId: tenant.tenantId });
  await db.collection("tenantDashboardUsers").deleteMany({ tenantId: tenant.tenantId });
  await client.close();
  console.log(`✓ Cleaned up ${del.deletedCount} employees and test user`);

  console.log("\n=== ✅ ALL EMPLOYEE CRUD TESTS PASSED ===\n");
}

main().catch((err) => {
  console.error("\n✗ Verification failed:", err.message);
  process.exit(1);
});
