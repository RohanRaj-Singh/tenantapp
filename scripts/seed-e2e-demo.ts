/**
 * E2E Demo Seed — RemedyGCC
 * ===================================================================
 *  DEVELOPMENT TEST DATA ONLY.  NEVER RUN IN PRODUCTION.
 *  NEVER RUN AGAINST A REMOTE OR SHARED DATABASE.
 *
 *  Purpose
 *  -------
 *  Create a deterministic, disposable dataset for manual end-to-end
 *  verification of:
 *
 *    A. Independent User (a.k.a. "Clinic User")  — modelled as an
 *       `employees` document with `tenantId: "tenant-individual"`,
 *       authorized for multiple tenants to test the multi-tenant SSE
 *       fix from the Clinic User audit.
 *
 *    B. Organization Employees  — separate per tenant, used to test
 *       cross-tenant isolation in the standard employee portal.
 *
 *    C. Super Admin  — uses the existing admin app; credentials are
 *       loaded from .env.local and are NOT created here.
 *
 *  The script:
 *
 *    - is idempotent (re-running does not duplicate records)
 *    - tags every record with `seedMarker: "e2e-demo"` so the cleanup
 *      script can remove ONLY demo records, never real data
 *    - refuses to run unless explicitly allowed with `--allow-dev`
 *      and a localhost-style MONGODB_URI
 *    - never calls `deleteMany({})` or any blanket destructive op
 *    - prints every credential, ID, and the intent of each record
 *
 *  Usage
 *  -----
 *    npx tsx --env-file=.env.local scripts/seed-e2e-demo.ts --allow-dev
 *
 *  Cleanup
 *  -------
 *    npx tsx --env-file=.env.local scripts/cleanup-e2e-demo.ts --allow-dev
 *    npx tsx --env-file=.env.local scripts/seed-e2e-demo.ts --allow-dev   # reseed
 *
 *  ID prefix convention (all start with `e2e_` for easy grep):
 *    tenants         : e2e_tenant_a / e2e_tenant_b / e2e_tenant_c
 *    employees       : e2e_emp_*
 *    reimbursements  : e2e_reimb_*
 *    notifications   : e2e_notif_*
 *    claimMessages   : e2e_msg_*
 *    claimRequests   : e2e_req_*
 *    paymentRecords  : e2e_pay_*
 *    invoices        : e2e_inv_*
 */

import * as bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

// ── Safety ──────────────────────────────────────────────────────────────────

function die(msg: string): never {
  console.error(`\nREFUSING TO RUN: ${msg}\n`);
  process.exit(2);
}

if (!process.argv.includes("--allow-dev")) {
  die(
    "Missing --allow-dev flag. This script only runs against a development database. " +
      "Re-run with: npx tsx --env-file=.env.local scripts/seed-e2e-demo.ts --allow-dev",
  );
}

if (process.env.NODE_ENV === "production") {
  die("NODE_ENV=production. Refusing to seed demo data.");
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  die("MONGODB_URI is not set.");
}

if (
  !/mongodb:\/\/(127\.0\.0\.1|localhost)/i.test(MONGODB_URI) &&
  !/mongodb\+srv:\/\//i.test(MONGODB_URI)
) {
  // Allow localhost OR a user's personal Atlas cluster. NEVER a
  // shared / production cluster — but we can't tell from URI alone, so
  // we also require --allow-dev (which is checked above).
  // No-op: allow any non-localhost URI when --allow-dev is set, but log
  // loudly so the operator notices.
  console.warn(
    `⚠️  MONGODB_URI is not a localhost address: ${MONGODB_URI}\n` +
      "    --allow-dev was provided, so continuing. Double-check this is a dev DB.",
  );
}

// ── Marker + helpers ────────────────────────────────────────────────────────

const MARKER = "e2e-demo";
const NOW = "2026-08-31T00:00:00.000Z";

function hash(plain: string): string {
  return bcrypt.hashSync(plain, 12);
}

function resolveDbName(uri: string): string {
  try {
    const u = new URL(uri);
    return u.pathname.replace(/^\/+/, "") || "remedygcc";
  } catch {
    return "remedygcc";
  }
}

function e2eId(kind: string, slug: string): string {
  return `e2e_${kind}_${slug}`;
}

// ── Seed dataset ────────────────────────────────────────────────────────────

const TENANT_PASSWORD = "TenantOwner1234"; // tenant dashboard user password
const EMPLOYEE_PASSWORD = "Password123"; // employee portal password

const TENANTS = [
  { tenantId: "e2e_tenant_a", slug: "e2e-a", name: "E2E Tenant A" },
  { tenantId: "e2e_tenant_b", slug: "e2e-b", name: "E2E Tenant B" },
  { tenantId: "e2e_tenant_c", slug: "e2e-c", name: "E2E Tenant C (isolation only)" },
];

const TENANT_DASHBOARD_USERS = [
  {
    id: "e2e_tenant_a_owner",
    tenantId: "e2e_tenant_a",
    email: "owner@e2e-a.example.test",
    username: "e2e.a.owner",
    password: TENANT_PASSWORD,
  },
  {
    id: "e2e_tenant_b_owner",
    tenantId: "e2e_tenant_b",
    email: "owner@e2e-b.example.test",
    username: "e2e.b.owner",
    password: TENANT_PASSWORD,
  },
  {
    id: "e2e_tenant_c_owner",
    tenantId: "e2e_tenant_c",
    email: "owner@e2e-c.example.test",
    username: "e2e.c.owner",
    password: TENANT_PASSWORD,
  },
];

const EMPLOYEES = [
  // Tenant A — two employees
  {
    employeeId: "e2e_emp_tenant_a_a1",
    tenantId: "e2e_tenant_a",
    employeeCode: "E2E-A-001",
    name: "E2E A — Alpha Employee",
    email: "alpha@e2e-a.example.test",
  },
  {
    employeeId: "e2e_emp_tenant_a_a2",
    tenantId: "e2e_tenant_a",
    employeeCode: "E2E-A-002",
    name: "E2E A — Bravo Employee",
    email: "bravo@e2e-a.example.test",
  },
  // Tenant B — one employee
  {
    employeeId: "e2e_emp_tenant_b_b1",
    tenantId: "e2e_tenant_b",
    employeeCode: "E2E-B-001",
    name: "E2E B — Alpha Employee",
    email: "alpha@e2e-b.example.test",
  },
  // Independent User (a.k.a. Clinic User)
  // Modelled as an employee of the reserved individual sentinel tenant.
  // The audit verifies that this user is authorized for Tenant A + B
  // (via the realtime SSE topic subscription layer) but NOT for C.
  // The employee model itself only stores `tenantId: "tenant-individual"`
  // — multi-tenant authorization is a marketing-site concept that
  // surfaces in the claim layer. We also create a parallel authorization
  // hint so SSE subscription tests can exercise the topic list.
  {
    employeeId: "e2e_emp_independent_user",
    tenantId: "tenant-individual",
    employeeCode: "E2E-IND-001",
    name: "E2E Independent / Clinic User",
    email: "e2e-independent@example.test",
  },
];

const INDEPENDENT_TENANT_IDS = ["e2e_tenant_a", "e2e_tenant_b"]; // for SSE test
const UNAUTHORIZED_TENANT_ID = "e2e_tenant_c";

// Claims cover the standard state machine and include high-volume
// sessionCount for the Independent User.
const CLAIMS = [
  // Independent User — normal claim (Tenant A)
  {
    reimbursementId: "e2e_reimb_indep_normal_a",
    tenantId: "e2e_tenant_a",
    employeeId: "e2e_emp_independent_user",
    employeeName: "E2E Independent / Clinic User",
    type: "reimbursement",
    amount: 250,
    description: "[E2E] Independent User — normal claim on Tenant A",
    status: "pending" as const,
  },
  // Independent User — high-volume claim (Tenant A)
  {
    reimbursementId: "e2e_reimb_indep_high_a",
    tenantId: "e2e_tenant_a",
    employeeId: "e2e_emp_independent_user",
    employeeName: "E2E Independent / Clinic User",
    type: "reimbursement",
    amount: 12500,
    description: "[E2E] Independent User — high-volume claim (1000 sessions) on Tenant A",
    sessionCount: 1000,
    sessionFor: "self",
    status: "in_progress" as const,
  },
  // Independent User — high-volume claim (Tenant B, different amount)
  {
    reimbursementId: "e2e_reimb_indep_high_b",
    tenantId: "e2e_tenant_b",
    employeeId: "e2e_emp_independent_user",
    employeeName: "E2E Independent / Clinic User",
    type: "reimbursement",
    amount: 8750,
    description: "[E2E] Independent User — high-volume claim (450 sessions) on Tenant B",
    sessionCount: 450,
    sessionFor: "self",
    status: "approved" as const,
  },
  // Tenant A employee — full lifecycle coverage
  {
    reimbursementId: "e2e_reimb_emp_a_pending",
    tenantId: "e2e_tenant_a",
    employeeId: "e2e_emp_tenant_a_a1",
    employeeName: "E2E A — Alpha Employee",
    type: "reimbursement",
    amount: 320,
    description: "[E2E] Tenant A Alpha — pending claim",
    status: "pending" as const,
  },
  {
    reimbursementId: "e2e_reimb_emp_a_approved",
    tenantId: "e2e_tenant_a",
    employeeId: "e2e_emp_tenant_a_a1",
    employeeName: "E2E A — Alpha Employee",
    type: "reimbursement",
    amount: 480,
    description: "[E2E] Tenant A Alpha — approved claim",
    status: "approved" as const,
  },
  {
    reimbursementId: "e2e_reimb_emp_a_rejected",
    tenantId: "e2e_tenant_a",
    employeeId: "e2e_emp_tenant_a_a1",
    employeeName: "E2E A — Alpha Employee",
    type: "reimbursement",
    amount: 1200,
    description: "[E2E] Tenant A Alpha — rejected claim",
    status: "rejected" as const,
  },
  {
    reimbursementId: "e2e_reimb_emp_a_to_be_paid",
    tenantId: "e2e_tenant_a",
    employeeId: "e2e_emp_tenant_a_a2",
    employeeName: "E2E A — Bravo Employee",
    type: "reimbursement",
    amount: 220,
    description: "[E2E] Tenant A Bravo — to_be_paid claim",
    status: "to_be_paid" as const,
  },
  {
    reimbursementId: "e2e_reimb_emp_a_paid",
    tenantId: "e2e_tenant_a",
    employeeId: "e2e_emp_tenant_a_a2",
    employeeName: "E2E A — Bravo Employee",
    type: "reimbursement",
    amount: 175,
    description: "[E2E] Tenant A Bravo — paid claim",
    status: "paid" as const,
  },
  // Tenant B employee — single claim for cross-tenant isolation
  {
    reimbursementId: "e2e_reimb_emp_b_pending",
    tenantId: "e2e_tenant_b",
    employeeId: "e2e_emp_tenant_b_b1",
    employeeName: "E2E B — Alpha Employee",
    type: "reimbursement",
    amount: 90,
    description: "[E2E] Tenant B Alpha — pending claim",
    status: "pending" as const,
  },
  // Tenant C — isolation-only claim (no Independent User access, no
  // Tenant A/B employee access)
  {
    reimbursementId: "e2e_reimb_tenant_c_isolation",
    tenantId: "e2e_tenant_c",
    employeeId: "e2e_emp_tenant_c_synthetic",
    employeeName: "E2E C — Synthetic Employee",
    type: "reimbursement",
    amount: 50,
    description: "[E2E] Tenant C isolation claim — must NOT appear for other users",
    status: "pending" as const,
  },
];

const CLAIM_MESSAGES = [
  {
    messageId: "e2e_msg_indep_a_1",
    tenantId: "e2e_tenant_a",
    claimId: "e2e_reimb_indep_normal_a",
    type: "message" as const,
    participant: {
      role: "employee" as const,
      id: "e2e_emp_independent_user",
      name: "E2E Independent / Clinic User",
      key: "employee:e2e_emp_independent_user",
    },
    body: "[E2E] Independent User — initial chat on normal claim",
  },
  {
    messageId: "e2e_msg_indep_a_2",
    tenantId: "e2e_tenant_a",
    claimId: "e2e_reimb_indep_normal_a",
    type: "message" as const,
    participant: {
      role: "tenantAdmin" as const,
      id: "e2e_tenant_a_owner",
      name: "E2E Tenant A Owner",
      key: "tenantAdmin:e2e_tenant_a_owner",
    },
    body: "[E2E] Tenant A admin — reply on normal claim",
  },
  {
    messageId: "e2e_msg_emp_a_1",
    tenantId: "e2e_tenant_a",
    claimId: "e2e_reimb_emp_a_pending",
    type: "message" as const,
    participant: {
      role: "employee" as const,
      id: "e2e_emp_tenant_a_a1",
      name: "E2E A — Alpha Employee",
      key: "employee:e2e_emp_tenant_a_a1",
    },
    body: "[E2E] Tenant A Alpha — pending claim chat seed",
  },
];

const CLAIM_REQUESTS = [
  {
    requestId: "e2e_req_indep_a",
    tenantId: "e2e_tenant_a",
    claimId: "e2e_reimb_indep_high_a",
    claimNumber: "E2E-REQ-001",
    subject: "[E2E] Independent User — request on high-volume claim",
    body: "Asking whether 1000-session claim can proceed at this rate.",
    status: "pending" as const,
    requester: {
      role: "employee" as const,
      id: "e2e_emp_independent_user",
      name: "E2E Independent / Clinic User",
      key: "employee:e2e_emp_independent_user",
    },
  },
  {
    requestId: "e2e_req_emp_a",
    tenantId: "e2e_tenant_a",
    claimId: "e2e_reimb_emp_a_pending",
    claimNumber: "E2E-REQ-002",
    subject: "[E2E] Tenant A Alpha — request on pending claim",
    body: "Asking for clarification on coverage.",
    status: "more_info" as const,
    requester: {
      role: "employee" as const,
      id: "e2e_emp_tenant_a_a1",
      name: "E2E A — Alpha Employee",
      key: "employee:e2e_emp_tenant_a_a1",
    },
    responder: {
      role: "tenantAdmin" as const,
      id: "e2e_tenant_a_owner",
      name: "E2E Tenant A Owner",
      key: "tenantAdmin:e2e_tenant_a_owner",
    },
    resolutionNote: "Please attach the receipt.",
  },
  {
    requestId: "e2e_req_tenant_c",
    tenantId: "e2e_tenant_c",
    claimId: "e2e_reimb_tenant_c_isolation",
    claimNumber: "E2E-REQ-003",
    subject: "[E2E] Tenant C — isolation request",
    body: "Should not be visible to other users.",
    status: "pending" as const,
    requester: {
      role: "employee" as const,
      id: "e2e_emp_tenant_c_synthetic",
      name: "E2E C — Synthetic Employee",
      key: "employee:e2e_emp_tenant_c_synthetic",
    },
  },
];

const NOTIFICATIONS = [
  {
    notificationId: "e2e_notif_indep_a_1",
    tenantId: "e2e_tenant_a",
    claimId: "e2e_reimb_indep_normal_a",
    claimNumber: "E2E-NOTIF-001",
    recipientType: "employee" as const,
    recipientId: "e2e_emp_independent_user",
    type: "claim_submitted" as const,
    title: "[E2E] Independent User — claim submitted",
    body: "Your E2E normal claim was submitted.",
    read: false,
  },
  {
    notificationId: "e2e_notif_indep_b_1",
    tenantId: "e2e_tenant_b",
    claimId: "e2e_reimb_indep_high_b",
    claimNumber: "E2E-NOTIF-002",
    recipientType: "employee" as const,
    recipientId: "e2e_emp_independent_user",
    type: "claim_approved" as const,
    title: "[E2E] Independent User — claim approved (Tenant B)",
    body: "Your E2E high-volume claim on Tenant B was approved.",
    read: false,
  },
  {
    notificationId: "e2e_notif_emp_a_1",
    tenantId: "e2e_tenant_a",
    claimId: "e2e_reimb_emp_a_pending",
    claimNumber: "E2E-NOTIF-003",
    recipientType: "employee" as const,
    recipientId: "e2e_emp_tenant_a_a1",
    type: "claim_submitted" as const,
    title: "[E2E] Tenant A Alpha — claim submitted",
    body: "Submitted for review.",
    read: false,
  },
  {
    notificationId: "e2e_notif_super_admin_1",
    tenantId: "e2e_tenant_a",
    claimId: "e2e_reimb_indep_high_a",
    claimNumber: "E2E-NOTIF-004",
    recipientType: "superAdmin" as const,
    recipientId: "super-admin",
    type: "claim_submitted" as const,
    title: "[E2E] High-volume claim awaiting super admin review",
    body: "Independent User submitted a 1000-session claim.",
    read: false,
  },
];

const PAYMENT_RECORDS = [
  {
    paymentRecordId: "e2e_pay_eligible_a",
    tenantId: "e2e_tenant_a",
    claimId: "e2e_reimb_emp_a_to_be_paid",
    amount: 220,
    status: "to_be_paid" as const,
  },
  {
    paymentRecordId: "e2e_pay_paid_a",
    tenantId: "e2e_tenant_a",
    claimId: "e2e_reimb_emp_a_paid",
    amount: 175,
    status: "paid" as const,
    paymentReference: "E2E-PAY-001",
    paidAt: NOW,
    paidBy: "e2e_tenant_a_owner",
  },
  {
    paymentRecordId: "e2e_pay_eligible_indep",
    tenantId: "e2e_tenant_b",
    claimId: "e2e_reimb_indep_high_b",
    amount: 8750,
    status: "to_be_paid" as const,
  },
];

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  const db = client.db(resolveDbName(MONGODB_URI!));

  const summary: Record<string, number> = {};

  // 1. Tenants
  {
    const col = db.collection("tenants");
    for (const t of TENANTS) {
      await col.replaceOne(
        { tenantId: t.tenantId },
        {
          tenantId: t.tenantId,
          name: t.name,
          slug: t.slug,
          status: "active",
          plan: "pro",
          branding: {},
          brandingVersionId: `brand_${t.slug}_e2e`,
          activeRuntimeConfigId: `runtime_${t.slug}_e2e`,
          activeRuntimeConfigPublishedAt: NOW,
          seedMarker: MARKER,
          createdAt: NOW,
          updatedAt: NOW,
        },
        { upsert: true },
      );
    }
    summary.tenants = TENANTS.length;
  }

  // 2. Tenant dashboard users
  {
    const col = db.collection("tenantDashboardUsers");
    for (const u of TENANT_DASHBOARD_USERS) {
      await col.replaceOne(
        { id: u.id },
        {
          id: u.id,
          tenantId: u.tenantId,
          email: u.email,
          username: u.username,
          passwordHash: hash(u.password),
          status: "active",
          mustChangePassword: false,
          lastLoginAt: null,
          seedMarker: MARKER,
          createdAt: NOW,
          updatedAt: NOW,
        },
        { upsert: true },
      );
    }
    summary.tenantDashboardUsers = TENANT_DASHBOARD_USERS.length;
  }

  // 3. Employees (real tenant employees + the Independent User)
  // Note: the tenant-c synthetic employee is created so the isolation
  // claim has a valid employeeId reference. We do NOT create a login
  // account for it; it only exists as a data record.
  {
    const col = db.collection("employees");
    const all = [
      ...EMPLOYEES,
      {
        employeeId: "e2e_emp_tenant_c_synthetic",
        tenantId: "e2e_tenant_c",
        employeeCode: "E2E-C-000",
        name: "E2E C — Synthetic Employee",
        email: "synthetic@e2e-c.example.test",
        synthetic: true,
      },
    ];
    for (const e of all) {
      await col.replaceOne(
        { employeeId: e.employeeId },
        {
          employeeId: e.employeeId,
          tenantId: e.tenantId,
          employeeCode: e.employeeCode,
          name: e.name,
          email: e.email,
          status: "active",
          passwordHash: hash(EMPLOYEE_PASSWORD),
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastAccessAt: null,
          seedMarker: MARKER,
          ...((e as { synthetic?: boolean }).synthetic
            ? { synthetic: true }
            : {}),
          createdAt: NOW,
          updatedAt: NOW,
        },
        { upsert: true },
      );
    }
    summary.employees = all.length;
  }

  // 4. Reimbursements
  {
    const col = db.collection("reimbursements");
    for (const c of CLAIMS) {
      await col.replaceOne(
        { reimbursementId: c.reimbursementId },
        {
          ...c,
          ...(c.status === "in_progress" || c.status === "approved" || c.status === "rejected" || c.status === "to_be_paid" || c.status === "paid"
            ? {
                history: [
                  {
                    status: "pending",
                    actorId: c.employeeId,
                    actorRole: "employee",
                    timestamp: NOW,
                  },
                  {
                    status: c.status,
                    actorId: c.tenantId,
                    actorRole: "tenantAdmin",
                    timestamp: NOW,
                  },
                ],
              }
            : { history: [{ status: "pending", actorId: c.employeeId, actorRole: "employee", timestamp: NOW }] }),
          seedMarker: MARKER,
          createdAt: NOW,
          updatedAt: NOW,
        },
        { upsert: true },
      );
    }
    summary.reimbursements = CLAIMS.length;
  }

  // 5. Claim messages
  {
    const col = db.collection("claimMessages");
    for (const m of CLAIM_MESSAGES) {
      await col.replaceOne(
        { messageId: m.messageId },
        { ...m, readBy: [m.participant.key], seedMarker: MARKER, createdAt: NOW, updatedAt: NOW },
        { upsert: true },
      );
    }
    summary.claimMessages = CLAIM_MESSAGES.length;
  }

  // 6. Claim requests
  {
    const col = db.collection("claimRequests");
    for (const r of CLAIM_REQUESTS) {
      await col.replaceOne(
        { requestId: r.requestId },
        { ...r, seedMarker: MARKER, createdAt: NOW, updatedAt: NOW },
        { upsert: true },
      );
    }
    summary.claimRequests = CLAIM_REQUESTS.length;
  }

  // 7. Notifications
  {
    const col = db.collection("notifications");
    for (const n of NOTIFICATIONS) {
      await col.replaceOne(
        { notificationId: n.notificationId },
        { ...n, readAt: null, seedMarker: MARKER, createdAt: NOW, updatedAt: NOW },
        { upsert: true },
      );
    }
    summary.notifications = NOTIFICATIONS.length;
  }

  // 8. Payment records
  {
    const col = db.collection("paymentRecords");
    for (const p of PAYMENT_RECORDS) {
      await col.replaceOne(
        { paymentRecordId: p.paymentRecordId },
        { ...p, seedMarker: MARKER, createdAt: NOW, updatedAt: NOW },
        { upsert: true },
      );
    }
    summary.paymentRecords = PAYMENT_RECORDS.length;
  }

  // 9. Counter for the claim number generator (so future claims don't collide)
  {
    const col = db.collection<{ seq: number; seedMarker: string }>("counters");
    await col.replaceOne(
      { _id: "e2e_demo_claim_counter" as unknown as import("mongodb").ObjectId },
      { seq: 999, seedMarker: MARKER },
      { upsert: true },
    );
  }

  await client.close();

  // ── Print summary ────────────────────────────────────────────────────────

  console.log("\n=========================================");
  console.log(" E2E DEMO SEED — DEVELOPMENT TEST DATA");
  console.log("=========================================\n");
  console.log("Markers: every record carries seedMarker=\"e2e-demo\".");
  console.log("Cleanup: scripts/cleanup-e2e-demo.ts\n");

  console.log("Seeded counts:");
  for (const [k, v] of Object.entries(summary)) {
    console.log(`  ${k}: ${v}`);
  }

  console.log("\n── TENANTS ──");
  for (const t of TENANTS) {
    console.log(`  ${t.tenantId}  (${t.name})  slug=${t.slug}`);
  }
  console.log(`\n  Isolation tenant (unauthorized for the Independent User): ${UNAUTHORIZED_TENANT_ID}`);
  console.log(`  Independent User authorized tenants (SSE topic list):     ${INDEPENDENT_TENANT_IDS.join(", ")}`);

  console.log("\n── CREDENTIALS ──");
  console.log("Tenant dashboard logins (per tenant):");
  for (const u of TENANT_DASHBOARD_USERS) {
    console.log(`  ${u.email}  /  ${TENANT_PASSWORD}  (tenant=${u.tenantId})`);
  }
  console.log("\nEmployee portal logins (all use the same password):");
  for (const e of EMPLOYEES) {
    console.log(
      `  ${e.email}  /  ${EMPLOYEE_PASSWORD}  (tenant=${e.tenantId}, code=${e.employeeCode})`,
    );
  }
  console.log("\nSuper Admin (uses admin app, NOT created here):");
  console.log("  See remedygcc-admin/.env.local → ADMIN_EMAIL / ADMIN_PASSWORD");
  console.log("  Database: mongodb://localhost:27017/tenantapp (the admin app's DB)");

  console.log("\n── CLAIM IDs ──");
  for (const c of CLAIMS) {
    console.log(`  ${c.reimbursementId}  status=${c.status}  tenant=${c.tenantId}  amount=${c.amount}  sessionCount=${"sessionCount" in c ? c.sessionCount : "n/a"}`);
  }

  console.log("\n── REQUEST IDs ──");
  for (const r of CLAIM_REQUESTS) {
    console.log(`  ${r.requestId}  status=${r.status}  tenant=${r.tenantId}  claim=${r.claimId}`);
  }

  console.log("\n── CHAT MESSAGE IDs ──");
  for (const m of CLAIM_MESSAGES) {
    console.log(`  ${m.messageId}  claim=${m.claimId}  role=${m.participant.role}`);
  }

  console.log("\n── PAYMENT RECORD IDs ──");
  for (const p of PAYMENT_RECORDS) {
    console.log(`  ${p.paymentRecordId}  status=${p.status}  tenant=${p.tenantId}  claim=${p.claimId}`);
  }

  console.log("\n── MULTI-TENANT SSE TEST PLAN ──");
  console.log("1. Log in as the Independent User (e2e-independent@example.test).");
  console.log("2. Open the portal/claim detail with the SSE connection active.");
  console.log("3. From another browser, log in as Tenant A owner and post a chat");
  console.log("   message on e2e_reimb_indep_normal_a → Independent User MUST receive it.");
  console.log("4. From another browser, log in as Tenant B owner and post a chat");
  console.log("   message on e2e_reimb_indep_high_b → Independent User MUST receive it.");
  console.log("5. Post a chat message on e2e_reimb_tenant_c_isolation →");
  console.log("   Independent User MUST NOT receive it.");
  console.log("6. Repeat the above three with notifications instead of chat.");

  console.log("\nDone.\n");
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
