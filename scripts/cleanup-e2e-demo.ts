/**
 * E2E Demo Cleanup — RemedyGCC
 * ===================================================================
 *  DEVELOPMENT TEST DATA ONLY.  NEVER RUN IN PRODUCTION.
 *
 *  Removes ONLY records carrying `seedMarker: "e2e-demo"`.
 *  Never calls `deleteMany({})` or any blanket destructive op.
 *  Refuses to run unless explicitly allowed with `--allow-dev`.
 *
 *  Usage
 *  -----
 *    npx tsx --env-file=.env.local scripts/cleanup-e2e-demo.ts --allow-dev
 */

import { MongoClient } from "mongodb";

// ── Safety ──────────────────────────────────────────────────────────────────

function die(msg: string): never {
  console.error(`\nREFUSING TO RUN: ${msg}\n`);
  process.exit(2);
}

if (!process.argv.includes("--allow-dev")) {
  die(
    "Missing --allow-dev flag. Re-run with: npx tsx --env-file=.env.local scripts/cleanup-e2e-demo.ts --allow-dev",
  );
}

if (process.env.NODE_ENV === "production") {
  die("NODE_ENV=production. Refusing to clean up demo data.");
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  die("MONGODB_URI is not set.");
}

const MARKER = "e2e-demo";

function resolveDbName(uri: string): string {
  try {
    const u = new URL(uri);
    return u.pathname.replace(/^\/+/, "") || "remedygcc";
  } catch {
    return "remedygcc";
  }
}

const TARGET_COLLECTIONS = [
  "tenants",
  "tenantDashboardUsers",
  "employees",
  "reimbursements",
  "claimMessages",
  "claimRequests",
  "notifications",
  "paymentRecords",
  "invoices",
  "counters",
];

async function main() {
  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  const db = client.db(resolveDbName(MONGODB_URI!));

  // 1. Preview what we are about to delete
  const preview: Record<string, number> = {};
  for (const name of TARGET_COLLECTIONS) {
    const count = await db.collection(name).countDocuments({ seedMarker: MARKER });
    if (count > 0) preview[name] = count;
  }

  console.log("\n=========================================");
  console.log(" E2E DEMO CLEANUP — DRY-RUN PREVIEW");
  console.log("=========================================\n");
  console.log("Records that will be removed (seedMarker=\"e2e-demo\" only):");
  for (const [k, v] of Object.entries(preview)) {
    console.log(`  ${k}: ${v}`);
  }
  const total = Object.values(preview).reduce((a, b) => a + b, 0);
  console.log(`  TOTAL: ${total}`);

  if (total === 0) {
    console.log("\nNothing to clean up.\n");
    await client.close();
    return;
  }

  // 2. Remove by marker — never by a blanket filter
  const removed: Record<string, number> = {};
  for (const name of TARGET_COLLECTIONS) {
    if (!preview[name]) continue;
    const result = await db.collection(name).deleteMany({ seedMarker: MARKER });
    removed[name] = result.deletedCount ?? 0;
  }

  // 3. Verify nothing else was touched
  const after: Record<string, number> = {};
  for (const name of TARGET_COLLECTIONS) {
    const count = await db.collection(name).countDocuments({ seedMarker: MARKER });
    if (count > 0) after[name] = count;
  }
  if (Object.keys(after).length > 0) {
    console.error("\nERROR: marker still present after cleanup:");
    console.error(after);
    await client.close();
    process.exit(1);
  }

  console.log("\nRemoved:");
  for (const [k, v] of Object.entries(removed)) {
    console.log(`  ${k}: ${v}`);
  }
  console.log("\nDone. No records outside seedMarker=\"e2e-demo\" were touched.\n");

  await client.close();
}

main().catch((e) => {
  console.error("Cleanup failed:", e);
  process.exit(1);
});
