// Full Pipeline Verification Script
// Tests Employees CRUD + Claims CRUD + Claims Review Workflow

import { MongoClient } from "mongodb";
import * as bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3000";
const MONGODB_URI = "mongodb://localhost:27017/tenantapp";

async function seedTestUser() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db("tenantapp");

  const tenant = await db.collection("tenants").findOne({ slug: "demo" });
  if (!tenant) throw new Error("demo tenant not found in MongoDB");

  const existing = await db.collection("tenantDashboardUsers").findOne({ tenantId: tenant.tenantId });
  if (existing) {
    console.log("✓ Test user already exists for demo tenant");
    await client.close();
    return { email: existing.email, password: "DemoOwner1234", tenantSlug: "demo", tenantId: tenant.tenantId };
  }

  const passwordHash = await bcrypt.hash("DemoOwner1234", 12);
  await db.collection("tenantDashboardUsers").insertOne({
    id: "demo-user-seed",
    tenantId: tenant.tenantId,
    email: "owner@demo.remedygcc.local",
    username: "demo.owner",
    passwordHash,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: null,
    mustChangePassword: false,
  });

  console.log("✓ Test user created for demo tenant");
  await client.close();
  return { email: "owner@demo.remedygcc.local", password: "DemoOwner1234", tenantSlug: "demo", tenantId: tenant.tenantId };
}

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-host": "demo.lvh.me:3000",
      ...options.headers,
    },
    ...options,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function main() {
  console.log("\n===========================================");
  console.log("  FULL PIPELINE VERIFICATION");
  console.log("===========================================\n");

  // Phase 1: Seed test user
  console.log("PHASE 1: Setup");
  console.log("----------------");
  const { email, password, tenantSlug, tenantId } = await seedTestUser();

  // Login
  console.log("\n1. Logging in...");
  let loginRes = await api("/api/tenant-auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: email, password }),
  });
  if (!loginRes.ok) {
    console.error(`✗ Login failed (${loginRes.status})`);
    process.exit(1);
  }
  const setCookie = loginRes.headers.get("set-cookie");
  if (!setCookie) { console.error("✗ No session cookie"); process.exit(1); }
  console.log("✓ Login successful");
  const auth = { Cookie: setCookie };

  // ===================================================================
  // PHASE 2: EMPLOYEE CRUD
  // ===================================================================
  console.log("\n\nPHASE 2: EMPLOYEE CRUD");
  console.log("-----------------------");

  // 2a. List employees (empty)
  console.log("\n2a. List employees (expecting empty)...");
  let res = await api("/api/employees", { headers: auth });
  if (!res.ok) { console.error(`✗ ${res.status}:`, res.data); process.exit(1); }
  console.log(`   Total: ${res.data.total}`);
  if (res.data.total !== 0) { console.error("✗ Expected 0"); process.exit(1); }

  // 2b. Create employees
  console.log("\n2b. Creating 5 employees...");
  const empData = [];
  for (const emp of [
    { employeeCode: "EMP-001", name: "Alice Johnson", email: "alice@company.com" },
    { employeeCode: "EMP-002", name: "Bob Smith", email: "bob@company.com" },
    { employeeCode: "EMP-003", name: "Charlie Brown", email: "charlie@company.com" },
    { employeeCode: "EMP-004", name: "Diana Prince", email: "diana@company.com" },
    { employeeCode: "EMP-005", name: "Eve Wilson", email: "eve@company.com" },
  ]) {
    res = await api("/api/employees", { method: "POST", body: JSON.stringify(emp), headers: auth });
    if (!res.ok) { console.error(`✗ Create ${emp.name} failed:`, res.data); process.exit(1); }
    empData.push(res.data);
    console.log(`   ✓ ${res.data.name} (${res.data.employeeCode})`);
  }

  // 2c. List employees (expecting 5)
  console.log("\n2c. List employees (expecting 5)...");
  res = await api("/api/employees", { headers: auth });
  if (!res.ok || res.data.total !== 5) { console.error("✗ Expected 5"); process.exit(1); }
  console.log(`   ✓ ${res.data.total} employees`);

  // 2d. Search
  console.log("\n2d. Search 'alice'...");
  res = await api("/api/employees?search=alice", { headers: auth });
  if (!res.ok || res.data.total !== 1) { console.error("✗ Search failed"); process.exit(1); }
  console.log(`   ✓ Found: ${res.data.employees[0].name}`);

  // 2e. Pagination
  console.log("\n2e. Pagination (limit=2)...");
  res = await api("/api/employees?skip=0&limit=2", { headers: auth });
  if (!res.ok || res.data.employees.length !== 2) { console.error("✗ Page size wrong"); process.exit(1); }
  const res2 = await api("/api/employees?skip=2&limit=2", { headers: auth });
  if (!res2.ok || res2.data.employees.length !== 2) { console.error("✗ Page 2 wrong"); process.exit(1); }
  console.log(`   ✓ Pages: ${res.data.employees.length}+${res2.data.employees.length} of ${res.data.total}`);

  // 2f. Get single
  console.log("\n2f. Get single employee...");
  const firstEmp = empData[0];
  res = await api(`/api/employees/${firstEmp.employeeId}`, { headers: auth });
  if (!res.ok || res.data.employeeId !== firstEmp.employeeId) { console.error("✗ Get failed"); process.exit(1); }
  console.log(`   ✓ ${res.data.name}`);

  // 2g. Update
  console.log("\n2g. Update employee name...");
  res = await api(`/api/employees/${firstEmp.employeeId}`, { method: "PUT", body: JSON.stringify({ name: "Alice Updated" }), headers: auth });
  if (!res.ok || res.data.name !== "Alice Updated") { console.error("✗ Update failed"); process.exit(1); }
  console.log(`   ✓ ${res.data.name}`);

  // 2h. Disable
  console.log("\n2h. Disable employee...");
  res = await api(`/api/employees/${firstEmp.employeeId}`, { method: "PATCH", body: JSON.stringify({ status: "inactive" }), headers: auth });
  if (!res.ok || res.data.status !== "inactive") { console.error("✗ Disable failed"); process.exit(1); }
  console.log(`   ✓ Status: ${res.data.status}`);

  // 2i. Filter inactive
  console.log("\n2i. Filter by inactive...");
  res = await api("/api/employees?status=inactive", { headers: auth });
  if (!res.ok || res.data.total !== 1) { console.error("✗ Filter failed"); process.exit(1); }
  console.log(`   ✓ ${res.data.total} inactive employee(s)`);

  // 2j. Re-enable
  console.log("\n2j. Re-enable employee...");
  res = await api(`/api/employees/${firstEmp.employeeId}`, { method: "PUT", body: JSON.stringify({ status: "active" }), headers: auth });
  if (!res.ok || res.data.status !== "active") { console.error("✗ Re-enable failed"); process.exit(1); }
  console.log(`   ✓ Status: ${res.data.status}`);

  console.log("\n✅ EMPLOYEE CRUD: ALL PASSED");

  // ===================================================================
  // PHASE 3: CLAIMS (REIMBURSEMENTS) CRUD + REVIEW
  // ===================================================================
  console.log("\n\nPHASE 3: CLAIMS CRUD & REVIEW");
  console.log("-----------------------------");

  const empId = firstEmp.employeeId;

  // 3a. List claims (empty)
  console.log("\n3a. List claims (expecting empty)...");
  res = await api("/api/reimbursements", { headers: auth });
  if (!res.ok) { console.error(`✗ ${res.status}:`, res.data); process.exit(1); }
  console.log(`   Total: ${res.data.total}`);
  if (res.data.total !== 0) { console.error("✗ Expected 0"); process.exit(1); }

  // 3b. Create claims
  console.log("\n3b. Creating 3 claims...");
  const claimData = [];
  const claims = [
    { employeeId: empId, employeeName: "Alice Updated", type: "medical", amount: 150.00, description: "Doctor visit" },
    { employeeId: empId, employeeName: "Alice Updated", type: "travel", amount: 320.50, description: "Business trip to Muscat" },
    { employeeId: empId, employeeName: "Alice Updated", type: "education", amount: 500.00, description: "Online course subscription" },
  ];
  for (const claim of claims) {
    res = await api("/api/reimbursements", { method: "POST", body: JSON.stringify(claim), headers: auth });
    if (!res.ok) { console.error(`✗ Create claim failed:`, res.data); process.exit(1); }
    claimData.push(res.data);
    console.log(`   ✓ ${res.data.type} - $${res.data.amount} (${res.data.status})`);
  }

  // 3c. List claims (expecting 3)
  console.log("\n3c. List claims (expecting 3)...");
  res = await api("/api/reimbursements", { headers: auth });
  if (!res.ok || res.data.total !== 3) { console.error("✗ Expected 3"); process.exit(1); }
  console.log(`   ✓ ${res.data.total} claims`);

  // 3d. Status filter
  console.log("\n3d. Filter by status=pending...");
  res = await api("/api/reimbursements?status=pending", { headers: auth });
  if (!res.ok || res.data.total !== 3) { console.error("✗ Expected 3 pending"); process.exit(1); }
  console.log(`   ✓ ${res.data.total} pending claims`);

  // 3e. Search claims
  console.log("\n3e. Search 'Muscat'...");
  res = await api("/api/reimbursements?search=Muscat", { headers: auth });
  if (!res.ok || res.data.total !== 1) { console.error("✗ Search failed"); process.exit(1); }
  console.log(`   ✓ Found: ${res.data.reimbursements[0].description}`);

  // 3f. Get single claim
  console.log("\n3f. Get single claim...");
  const firstClaim = claimData[0];
  res = await api(`/api/reimbursements/${firstClaim.reimbursementId}`, { headers: auth });
  if (!res.ok || res.data.reimbursementId !== firstClaim.reimbursementId) { console.error("✗ Get failed"); process.exit(1); }
  console.log(`   ✓ $${res.data.amount} - ${res.data.status}`);

  // ===================================================================
  // PHASE 4: CLAIMS REVIEW WORKFLOW
  // ===================================================================
  console.log("\n\nPHASE 4: CLAIMS REVIEW WORKFLOW");
  console.log("-------------------------------");

  // 4a. Approve claim #1
  console.log("\n4a. Approve claim #1...");
  res = await api(`/api/reimbursements/${claimData[0].reimbursementId}/approve`, { method: "POST", headers: auth });
  if (!res.ok || res.data.status !== "approved") { console.error("✗ Approve failed:", res.data); process.exit(1); }
  console.log(`   ✓ Status: ${res.data.status}`);
  if (!res.data.reviewedBy || !res.data.reviewedAt) { console.error("✗ Review metadata missing"); process.exit(1); }
  console.log(`   ✓ Reviewed by: ${res.data.reviewedBy}`);

  // 4b. Reject claim #2
  console.log("\n4b. Reject claim #2...");
  res = await api(`/api/reimbursements/${claimData[1].reimbursementId}/reject`, { method: "POST", headers: auth });
  if (!res.ok || res.data.status !== "rejected") { console.error("✗ Reject failed"); process.exit(1); }
  console.log(`   ✓ Status: ${res.data.status}`);

  // 4c. Freeze claim #3
  console.log("\n4c. Freeze claim #3...");
  res = await api(`/api/reimbursements/${claimData[2].reimbursementId}/freeze`, { method: "POST", headers: auth });
  if (!res.ok || res.data.status !== "frozen") { console.error("✗ Freeze failed"); process.exit(1); }
  console.log(`   ✓ Status: ${res.data.status}`);

  // 4d. Verify all statuses in list
  console.log("\n4d. Verify all statuses in list...");
  res = await api("/api/reimbursements?limit=10", { headers: auth });
  if (!res.ok) { console.error("✗ List failed"); process.exit(1); }
  const statuses = res.data.reimbursements.map(r => r.status).sort();
  console.log(`   Statuses: ${statuses.join(", ")}`);
  if (statuses.join(",") !== "approved,frozen,rejected") {
    console.error("✗ Expected approved, frozen, rejected");
    process.exit(1);
  }

  // 4e. Filter by approved
  console.log("\n4e. Filter status=approved...");
  res = await api("/api/reimbursements?status=approved", { headers: auth });
  if (!res.ok || res.data.total !== 1) { console.error("✗ Expected 1 approved"); process.exit(1); }
  console.log(`   ✓ ${res.data.total} approved claim(s)`);

  // 4f. Filter by rejected
  console.log("\n4f. Filter status=rejected...");
  res = await api("/api/reimbursements?status=rejected", { headers: auth });
  if (!res.ok || res.data.total !== 1) { console.error("✗ Expected 1 rejected"); process.exit(1); }
  console.log(`   ✓ ${res.data.total} rejected claim(s)`);

  // 4g. Tenent isolation: claims for non-existent employee should not be visible
  console.log("\n4g. Verify claims are for our employee...");
  for (const c of claimData) {
    if (c.tenantId !== tenantId) { console.error("✗ Wrong tenant on claim"); process.exit(1); }
  }
  console.log(`   ✓ All ${claimData.length} claims have correct tenantId`);

  console.log("\n✅ CLAIMS CRUD & REVIEW: ALL PASSED");

  // ===================================================================
  // PHASE 5: CLEANUP
  // ===================================================================
  console.log("\n\nPHASE 5: Cleanup");
  console.log("----------------");
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db("tenantapp");
  const t = await db.collection("tenants").findOne({ slug: "demo" });

  const delEmp = await db.collection("employees").deleteMany({ tenantId: t.tenantId });
  const delReimb = await db.collection("reimbursements").deleteMany({ tenantId: t.tenantId });
  await db.collection("tenantDashboardUsers").deleteMany({ tenantId: t.tenantId });
  await client.close();
  console.log(`   ✓ Removed ${delEmp.deletedCount} employees, ${delReimb.deletedCount} claims, and test user`);

  console.log("\n===========================================");
  console.log("  ✅  ALL TESTS PASSED");
  console.log("===========================================\n");
}

main().catch((err) => {
  console.error("\n✗ VERIFICATION FAILED:", err.message);
  process.exit(1);
});
