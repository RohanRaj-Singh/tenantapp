/**
 * Development seed script — populates MongoDB with demo users, tenants, and employees.
 *
 * Run once after setting MONGODB_URI in .env.local:
 *   npx tsx --env-file=.env.local scripts/seed-dev.ts
 *
 * Idempotent: uses upsert so it is safe to run multiple times.
 */

import * as bcrypt from "bcryptjs";
import { MongoClient, ServerApiVersion } from "mongodb";
import { randomUUID } from "crypto";
import { scryptSync, randomBytes } from "crypto";

// ── Config ───────────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI is not set. Run with --env-file=.env.local");
  process.exit(1);
}

function resolveDatabaseName(uri: string): string {
  try {
    const parsed = new URL(uri);
    const name = parsed.pathname.replace(/^\/+/, "");
    return name || "remedygcc";
  } catch {
    return "remedygcc";
  }
}

// ── PIN hashing (mirrors employeeService.ts) ─────────────────────────────────

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const NOW = "2026-06-01T00:00:00.000Z";

// Tenant dashboard login users
const DASHBOARD_USERS = [
  {
    id: "tenant-user-demo-owner",
    tenantId: "tenant-demo",
    email: "owner@demo.remedygcc.local",
    username: "demo.owner",
    password: "DemoOwner1234",
    status: "active",
    mustChangePassword: false,
  },
  {
    id: "tenant-user-tenant-b-owner",
    tenantId: "tenant-remedygcc-b",
    email: "owner@tenant-b.remedygcc.local",
    username: "tenantb.owner",
    password: "TenantBOwner1234",
    status: "active",
    mustChangePassword: false,
  },
] as const;

// Tenant records — minimal but functional for auth + employee portal
const TENANTS = [
  { tenantId: "tenant-demo", name: "Demo Tenant", slug: "demo" },
  { tenantId: "tenant-remedygcc-b", name: "Tenant B", slug: "tenant-b" },
  { tenantId: "tenant-omantel", name: "Omantel", slug: "omantel" },
  { tenantId: "tenant-oq", name: "OQ", slug: "oq" },
  { tenantId: "tenant-pdo", name: "PDO", slug: "pdo" },
];

// Employee records for the marketing-site employee portal
const EMPLOYEES: Array<{
  employeeId: string;
  tenantId: string;
  employeeCode: string;
  name: string;
  email: string;
  pin: string;
}> = [
  { employeeId: "emp_tenant-omantel_omt-001", tenantId: "tenant-omantel", employeeCode: "OMT-001", name: "Ahmed Al Balushi", email: "ahmed.balushi@omantel.om", pin: "1234" },
  { employeeId: "emp_tenant-omantel_omt-002", tenantId: "tenant-omantel", employeeCode: "OMT-002", name: "Mariam Al Siyabi", email: "mariam.siyabi@omantel.om", pin: "1234" },
  { employeeId: "emp_tenant-oq_oq-001", tenantId: "tenant-oq", employeeCode: "OQ-001", name: "Said Al Hinai", email: "said.hinai@oq.com", pin: "1234" },
  { employeeId: "emp_tenant-oq_oq-002", tenantId: "tenant-oq", employeeCode: "OQ-002", name: "Noor Al Zadjali", email: "noor.zadjali@oq.com", pin: "1234" },
  { employeeId: "emp_tenant-pdo_pdo-001", tenantId: "tenant-pdo", employeeCode: "PDO-001", name: "Fatma Al Riyami", email: "fatma.riyami@pdo.co.om", pin: "1234" },
  { employeeId: "emp_tenant-pdo_pdo-002", tenantId: "tenant-pdo", employeeCode: "PDO-002", name: "Hamed Al Busaidi", email: "hamed.busaidi@pdo.co.om", pin: "1234" },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const client = new MongoClient(MONGODB_URI!, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    const db = client.db(resolveDatabaseName(MONGODB_URI!));

    // ── 1. Tenant dashboard users ────────────────────────────────────────────

    console.log("Seeding tenant dashboard users…");
    const usersCol = db.collection("tenantDashboardUsers");

    for (const u of DASHBOARD_USERS) {
      const passwordHash = await bcrypt.hash(u.password, 12);
      await usersCol.replaceOne(
        { id: u.id },
        {
          id: u.id,
          tenantId: u.tenantId,
          email: u.email,
          username: u.username,
          passwordHash,
          status: u.status,
          mustChangePassword: u.mustChangePassword,
          lastLoginAt: null,
          createdAt: NOW,
          updatedAt: NOW,
        },
        { upsert: true },
      );
      console.log(`  ✓ ${u.email}  (password: ${u.password})`);
    }

    // ── 2. Tenants ───────────────────────────────────────────────────────────

    console.log("Seeding tenants…");
    const tenantsCol = db.collection("tenants");

    for (const t of TENANTS) {
      await tenantsCol.replaceOne(
        { tenantId: t.tenantId },
        {
          tenantId: t.tenantId,
          name: t.name,
          slug: t.slug,
          status: "active",
          plan: "pro",
          branding: {},
          brandingVersionId: `brand_${t.slug}_seed`,
          activeRuntimeConfigId: `runtime_${t.slug}_seed`,
          activeRuntimeConfigPublishedAt: NOW,
          createdAt: NOW,
          updatedAt: NOW,
        },
        { upsert: true },
      );
      console.log(`  ✓ ${t.name} (${t.slug})`);
    }

    // ── 3. Employees ─────────────────────────────────────────────────────────

    console.log("Seeding employees (PIN: 1234 for all)…");
    const employeesCol = db.collection("employees");

    for (const e of EMPLOYEES) {
      const pinHash = hashPin(e.pin);
      await employeesCol.replaceOne(
        { employeeId: e.employeeId },
        {
          employeeId: e.employeeId,
          tenantId: e.tenantId,
          employeeCode: e.employeeCode,
          name: e.name,
          email: e.email,
          status: "active",
          pinHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastAccessAt: null,
          createdAt: NOW,
          updatedAt: NOW,
        },
        { upsert: true },
      );
      console.log(`  ✓ ${e.name} (${e.employeeCode})`);
    }

    console.log("\nDone. MongoDB is ready for development.\n");
    console.log("Tenant dashboard logins:");
    for (const u of DASHBOARD_USERS) {
      console.log(`  ${u.email}  /  ${u.password}`);
    }
    console.log("\nEmployee portal PIN: 1234 (all employees)");
  } finally {
    await client.close();
  }
}

main().catch((err: unknown) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
