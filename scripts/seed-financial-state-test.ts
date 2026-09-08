/**
 * Financial State Test Seed - RemedyGCC
 * ===================================================================
 *  DEVELOPMENT TEST DATA ONLY.  NEVER RUN IN PRODUCTION.
 *
 *  Purpose
 *  -------
 *  Create a SMALL, controlled dataset covering the important financial
 *  states so the Super Admin UI can be walked through manually:
 *
 *    pending / in_progress / approved / rejected / frozen
 *    invoiced + awaiting organization payment (issued)
 *    ready to pay (to_be_paid)
 *    paid (payment history)
 *    one multi-claim issued invoice (org owes Remedy; all claims awaiting)
 *    one multi-claim paid invoice (claims at mixed payout stages)
 *    full-lifecycle test claim (created at pending - NOT auto-progressed)
 *    partial-lifecycle test claim (created at approved)
 *    one high-volume (1000-session) claim
 *
 *  The script is a SELF-CONTAINED RESET + SEED:
 *    1. Deletes ONLY records carrying `seedMarker: "financial-state-test"`.
 *    2. Ensures the primary test tenant / employees exist (created tagged
 *       with the marker ONLY IF absent - an existing E2E demo tenant is
 *       never overwritten or re-tagged).
 *    3. Recreates the controlled dataset.
 *    Running it twice always yields exactly one copy of the dataset.
 *
 *  Record shapes mirror the production writers:
 *    - Claim <-> invoice linkage = invoice LINE ITEMS (the same read-time
 *      join `getClaimInvoiceLinks` the UI uses). We never fake a claim-side
 *      status - an `approved` claim on an `issued` invoice really reads as
 *      "Awaiting organization payment"; a `to_be_paid` claim on a `paid`
 *      invoice really reads as "Ready to pay".
 *    - PaymentRecords are written in the exact `queueForPayment` /
 *      `processPayments` shapes (status to_be_paid / paid, invoiceId,
 *      paymentReference, paidAt, paidBy).
 *
 *  SAFETY
 *  ------
 *  Requires ALL of:
 *    - NODE_ENV !== "production"
 *    - explicit `--allow-dev` argument
 *    - a valid MONGODB_URI
 *  Any failure aborts BEFORE connecting to MongoDB.
 *
 *  Usage
 *  -----
 *    npx tsx --env-file=.env.local scripts/seed-financial-state-test.ts --allow-dev
 *
 *  Cleanup
 *  -------
 *    npx tsx --env-file=.env.local scripts/cleanup-financial-state-test.ts --allow-dev
 */

import * as bcrypt from "bcryptjs";
import { MongoClient, type Db } from "mongodb";

// Safety ---------------------------------------------------------------------

function die(msg: string): never {
  console.error(`\nREFUSING TO RUN: ${msg}\n`);
  process.exit(2);
}

if (!process.argv.includes("--allow-dev")) {
  die(
    "Missing --allow-dev flag. This script only runs against a development database. " +
      "Re-run with: npx tsx --env-file=.env.local scripts/seed-financial-state-test.ts --allow-dev",
  );
}

if (process.env.NODE_ENV === "production") {
  die("NODE_ENV=production. Refusing to seed financial test data.");
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  die("MONGODB_URI is not set. Run with --env-file=.env.local");
}

if (
  !/mongodb:\/\/(127\.0\.0\.1|localhost)/i.test(MONGODB_URI) &&
  !/mongodb\+srv:\/\//i.test(MONGODB_URI)
) {
  console.warn(
    `[!] MONGODB_URI is not a localhost address: ${MONGODB_URI}\n` +
      "    --allow-dev was provided, so continuing. Double-check this is a dev DB.",
  );
}

// Marker + shared constants ---------------------------------------------------

/** Every record created by this script carries this marker. */
const MARKER = "financial-state-test";

/** Fixed reference timestamp (2026-09-01) so records are deterministic. */
const NOW = "2026-09-01T00:00:00.000Z";

const ACTOR_SUPER_ADMIN = "super-admin";
const ACTOR_TENANT_ADMIN = "e2e_tenant_a_owner";

// Primary test tenant / employees (reuse the E2E demo references) ------------
// The E2E demo seed already creates `e2e_tenant_a` with employees
// `e2e_emp_tenant_a_a1` / `a2`; we reference those (creating minimal tagged
// records only if absent) so no new tenant is introduced.

const TENANT_ID = "e2e_tenant_a";
const TENANT_NAME = "E2E Tenant A";
const TENANT_SLUG = "e2e-a";

const EMP_A1 = "e2e_emp_tenant_a_a1";
const EMP_A2 = "e2e_emp_tenant_a_a2";
const EMP_NAME_A1 = "E2E A - Alpha Employee";
const EMP_NAME_A2 = "E2E A - Bravo Employee";
const EMPLOYEE_PASSWORD = "Password123";

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
// Dataset - claims -----------------------------------------------------------
// 14 claims. FIN-001..008 cover one clean state each; FIN-GA2/GA3 + FIN-GB3
// extend the multi-claim invoices; FIN-FULL/PARTIAL/HIGH are the manual
// walk-through records. Every claim is deterministic and individually
// readable. Amounts make invoice totals trivial to verify.

type FinClaimStatus =
  | "pending"
  | "in_progress"
  | "approved"
  | "to_be_paid"
  | "rejected"
  | "frozen"
  | "paid";

interface FinClaimSeed {
  reimbursementId: string;
  claimNumber: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  status: FinClaimStatus;
  amount: number;
  description: string;
  purpose: string;
  /** Maps to the INV-* invoice definitions below. */
  invoiceRef?: "INV-FIN-001" | "INV-FIN-002";
  serviceDate?: string;
  sessionCount?: number;
  sessionTypes?: string[];
  sessionFor?: string;
  bankAccountNumber?: string;
  bankName?: string;
}

const FIN_CLAIMS: FinClaimSeed[] = [
  // One claim per review-state (no invoice) ----------------------------------
  {
    reimbursementId: "fin_001",
    claimNumber: "RMB-2026-900001",
    tenantId: TENANT_ID,
    employeeId: EMP_A1,
    employeeName: EMP_NAME_A1,
    status: "pending",
    amount: 100,
    description: "FIN-001 - Pending Review",
    purpose: "Review screen",
    serviceDate: "2026-08-05",
  },
  {
    reimbursementId: "fin_002",
    claimNumber: "RMB-2026-900002",
    tenantId: TENANT_ID,
    employeeId: EMP_A1,
    employeeName: EMP_NAME_A1,
    status: "in_progress",
    amount: 200,
    description: "FIN-002 - In Progress Review",
    purpose: "Active review",
    serviceDate: "2026-08-06",
  },
  {
    reimbursementId: "fin_003",
    claimNumber: "RMB-2026-900003",
    tenantId: TENANT_ID,
    employeeId: EMP_A1,
    employeeName: EMP_NAME_A1,
    status: "approved",
    amount: 300,
    description: "FIN-003 - Approved / Ready to Bill",
    purpose: "Ready to Bill",
    serviceDate: "2026-08-07",
    bankAccountNumber: "FIN-ACCT-003",
    bankName: "Bank Muscat",
  },
  {
    reimbursementId: "fin_004",
    claimNumber: "RMB-2026-900004",
    tenantId: TENANT_ID,
    employeeId: EMP_A1,
    employeeName: EMP_NAME_A1,
    status: "rejected",
    amount: 400,
    description: "FIN-004 - Rejected Claim",
    purpose: "Rejection flow",
    serviceDate: "2026-08-08",
  },
  {
    reimbursementId: "fin_005",
    claimNumber: "RMB-2026-900005",
    tenantId: TENANT_ID,
    employeeId: EMP_A1,
    employeeName: EMP_NAME_A1,
    status: "frozen",
    amount: 500,
    description: "FIN-005 - Frozen Claim",
    purpose: "Frozen workflow",
    serviceDate: "2026-08-09",
  },

  // Invoiced / awaiting organization payment (issued invoice INV-FIN-001) ----
  // Production model: the CLAIM stays `approved`; "Awaiting organization
  // payment" is derived from the invoice linkage (status issued).
  {
    reimbursementId: "fin_006",
    claimNumber: "RMB-2026-900006",
    tenantId: TENANT_ID,
    employeeId: EMP_A1,
    employeeName: EMP_NAME_A1,
    status: "approved",
    amount: 600,
    description: "FIN-006 - Awaiting Organization Payment",
    purpose: "Invoice workflow",
    invoiceRef: "INV-FIN-001",
    serviceDate: "2026-08-10",
    bankAccountNumber: "FIN-ACCT-006",
    bankName: "Bank Muscat",
  },
  {
    reimbursementId: "fin_007",
    claimNumber: "RMB-2026-900007",
    tenantId: TENANT_ID,
    employeeId: EMP_A2,
    employeeName: EMP_NAME_A2,
    status: "to_be_paid",
    amount: 700,
    description: "FIN-007 - Ready to Pay",
    purpose: "Payout workflow",
    invoiceRef: "INV-FIN-002",
    serviceDate: "2026-08-13",
    bankAccountNumber: "FIN-ACCT-007",
    bankName: "Bank Dhofar",
  },
  {
    reimbursementId: "fin_008",
    claimNumber: "RMB-2026-900008",
    tenantId: TENANT_ID,
    employeeId: EMP_A2,
    employeeName: EMP_NAME_A2,
    status: "paid",
    amount: 800,
    description: "FIN-008 - Paid",
    purpose: "Payment history",
    invoiceRef: "INV-FIN-002",
    serviceDate: "2026-08-14",
    bankAccountNumber: "FIN-ACCT-008",
    bankName: "Bank Dhofar",
  },

  // INVOICE GROUP A - one issued invoice with 3 approved claims ---------------
  // (A1 = FIN-006). Total = 600 + 650 + 700 = 1950.
  {
    reimbursementId: "fin_ga2",
    claimNumber: "RMB-2026-900009",
    tenantId: TENANT_ID,
    employeeId: EMP_A1,
    employeeName: EMP_NAME_A1,
    status: "approved",
    amount: 650,
    description: "FIN-GA2 - Group A / issued invoice",
    purpose: "Multi-claim invoice A",
    invoiceRef: "INV-FIN-001",
    serviceDate: "2026-08-11",
    bankAccountNumber: "FIN-ACCT-GA2",
    bankName: "Bank Muscat",
  },
  {
    reimbursementId: "fin_ga3",
    claimNumber: "RMB-2026-900010",
    tenantId: TENANT_ID,
    employeeId: EMP_A2,
    employeeName: EMP_NAME_A2,
    status: "approved",
    amount: 700,
    description: "FIN-GA3 - Group A / issued invoice",
    purpose: "Multi-claim invoice A",
    invoiceRef: "INV-FIN-001",
    serviceDate: "2026-08-12",
    bankAccountNumber: "FIN-ACCT-GA3",
    bankName: "Bank Dhofar",
  },

  // INVOICE GROUP B - one PAID invoice whose claims sit at different payout
  // stages (B1 = FIN-007 to_be_paid, B2 = FIN-008 paid, B3 = FIN-GB3
  // to_be_paid). This is the legitimate post-organization-payment state:
  // markInvoicePaid queued all linked approved claims to `to_be_paid` at
  // once; individual payouts then settle them one by one. Total = 2250.
  {
    reimbursementId: "fin_gb3",
    claimNumber: "RMB-2026-900011",
    tenantId: TENANT_ID,
    employeeId: EMP_A1,
    employeeName: EMP_NAME_A1,
    status: "to_be_paid",
    amount: 750,
    description: "FIN-GB3 - Group B / payout pending",
    purpose: "Multi-claim invoice B",
    invoiceRef: "INV-FIN-002",
    serviceDate: "2026-08-15",
    bankAccountNumber: "FIN-ACCT-GB3",
    bankName: "Bank Muscat",
  },

  // Manual walk-through records ------------------------------------------------

  {
    reimbursementId: "fin_full_001",
    claimNumber: "RMB-2026-900012",
    tenantId: TENANT_ID,
    employeeId: EMP_A1,
    employeeName: EMP_NAME_A1,
    status: "pending",
    amount: 900,
    description: "FIN-FULL-001 - Full Lifecycle Test",
    purpose: "Full lifecycle (manual)",
    serviceDate: "2026-08-16",
    bankAccountNumber: "FIN-ACCT-FULL",
    bankName: "Bank Muscat",
  },
  {
    reimbursementId: "fin_partial_001",
    claimNumber: "RMB-2026-900013",
    tenantId: TENANT_ID,
    employeeId: EMP_A2,
    employeeName: EMP_NAME_A2,
    status: "approved",
    amount: 1000,
    description: "FIN-PARTIAL-001 - Partial Lifecycle Test",
    purpose: "Partial lifecycle (stop points)",
    serviceDate: "2026-08-17",
    bankAccountNumber: "FIN-ACCT-PARTIAL",
    bankName: "Bank Dhofar",
  },
  {
    reimbursementId: "fin_high_001",
    claimNumber: "RMB-2026-900014",
    tenantId: TENANT_ID,
    employeeId: EMP_A1,
    employeeName: EMP_NAME_A1,
    status: "approved",
    amount: 1100,
    description: "FIN-HIGH-001 - 1000 Session Claim",
    purpose: "1,000 sessions UI test",
    serviceDate: "2026-08-18",
    sessionCount: 1000,
    sessionTypes: ["Physiotherapy"],
    sessionFor: "self",
    bankAccountNumber: "FIN-ACCT-HIGH",
    bankName: "Bank Muscat",
  },
];

// Dataset - invoices ------------------------------------------------------------
// Line items are DERIVED from FIN_CLAIMS (single source of truth), so the
// claim <-> invoice linkage, totals and billing periods are correct by
// construction and can never drift from the claim data.

interface FinInvoiceSeed {
  invoiceRef: "INV-FIN-001" | "INV-FIN-002";
  invoiceId: string;
  invoiceNumber: string;
  status: "issued" | "paid";
  meaning: string;
}

const FIN_INVOICES: FinInvoiceSeed[] = [
  {
    invoiceRef: "INV-FIN-001",
    invoiceId: "fin_inv_001",
    invoiceNumber: "INV-E2EA-2026-90000001",
    status: "issued",
    meaning: "Awaiting Organization Payment (3 claims)",
  },
  {
    invoiceRef: "INV-FIN-002",
    invoiceId: "fin_inv_002",
    invoiceNumber: "INV-E2EA-2026-90000002",
    status: "paid",
    meaning: "Org paid - claims in payout cycle (3 claims)",
  },
];

// Dataset definition end - document builders below.

// ── Document builders ────────────────────────────────────────────────────────
// Shapes mirror the production writers exactly:
//   claims   -> reimbursementService.createReimbursement (history trail per
//               assertValidTransition: pending -> in_progress -> approved ->
//               to_be_paid -> paid; rejected/frozen terminal from in_progress)
//   invoices -> invoiceService.generateInvoice. The claim<->invoice
//               relationship IS the invoice lineItems (read-time join via
//               getClaimInvoiceLinks); no claim-side foreign key exists.
//   payments -> PaymentRecordDocument, written when a claim is queued
//               `to_be_paid` and finalized when `paid`.
//
// `import type` only: shapes are typechecked against the real documents and
// fully erased at runtime, so the script stays self-contained under tsx.

import type {
  ClaimHistoryEntry,
  InvoiceDocument,
  InvoiceLineItem,
  PaymentRecordDocument,
  ReimbursementDocument,
} from "@/src/server/db/documents";

/** Stored shapes: production documents + the script's marker tag. */
type StoredClaim = ReimbursementDocument & { seedMarker: string };
type StoredInvoice = InvoiceDocument & { seedMarker: string };
type StoredPayment = PaymentRecordDocument & { seedMarker: string };

/** Deterministic timestamps: day(N) = N days BEFORE the fixed NOW. */
function day(offsetDays: number): string {
  return new Date(Date.parse(NOW) - offsetDays * 86_400_000).toISOString();
}

/** Reservation ceiling for the SHARED claimNumber counter. $max only. */
const CLAIM_NUMBER_RESERVE = 900100;

interface FinEmployeeSeed {
  employeeId: string;
  name: string;
  code: string;
}

const FIN_EMPLOYEES: FinEmployeeSeed[] = [
  { employeeId: EMP_A1, name: EMP_NAME_A1, code: "E2E-A-A1" },
  { employeeId: EMP_A2, name: EMP_NAME_A2, code: "E2E-A-A2" },
];

/** Full audit trail consistent with the production transition rules. */
function historyFor(c: FinClaimSeed): ClaimHistoryEntry[] {
  const entries: ClaimHistoryEntry[] = [
    { status: "pending", actorId: c.employeeId, actorRole: "employee", timestamp: day(10) },
  ];
  if (c.status !== "pending") {
    entries.push({ status: "in_progress", actorId: ACTOR_TENANT_ADMIN, actorRole: "tenantAdmin", timestamp: day(8) });
  }
  if (c.status === "rejected") {
    entries.push({ status: "rejected", actorId: ACTOR_TENANT_ADMIN, actorRole: "tenantAdmin", note: "FIN test: rejection flow check", timestamp: day(6) });
  }
  if (c.status === "frozen") {
    entries.push({ status: "frozen", actorId: ACTOR_TENANT_ADMIN, actorRole: "tenantAdmin", note: "FIN test: frozen workflow check", timestamp: day(6) });
  }
  if (c.status === "approved" || c.status === "to_be_paid" || c.status === "paid") {
    entries.push({ status: "approved", actorId: ACTOR_TENANT_ADMIN, actorRole: "tenantAdmin", timestamp: day(6) });
  }
  if (c.status === "to_be_paid" || c.status === "paid") {
    entries.push({ status: "to_be_paid", actorId: ACTOR_SUPER_ADMIN, actorRole: "tenantAdmin", note: "Organization payment recorded", timestamp: day(3) });
  }
  if (c.status === "paid") {
    entries.push({ status: "paid", actorId: ACTOR_TENANT_ADMIN, actorRole: "tenantAdmin", timestamp: day(1) });
  }
  return entries;
}

function buildClaimDoc(c: FinClaimSeed): ReimbursementDocument & { seedMarker: string } {
  const reviewed = c.status !== "pending" && c.status !== "in_progress";
  return {
    reimbursementId: c.reimbursementId,
    claimNumber: c.claimNumber,
    tenantId: c.tenantId,
    employeeId: c.employeeId,
    employeeName: c.employeeName,
    type: "reimbursement",
    amount: c.amount,
    description: c.description,
    serviceDate: c.serviceDate,
    ...(c.sessionCount !== undefined ? { sessionCount: c.sessionCount } : {}),
    ...(c.sessionTypes ? { sessionTypes: c.sessionTypes } : {}),
    ...(c.sessionFor ? { sessionFor: c.sessionFor } : {}),
    ...(c.bankAccountNumber ? { bankAccountNumber: c.bankAccountNumber } : {}),
    ...(c.bankName ? { bankName: c.bankName } : {}),
    status: c.status,
    ...(reviewed ? { reviewedBy: ACTOR_TENANT_ADMIN, reviewedAt: day(6) } : {}),
    ...(c.status === "rejected" ? { notes: "FIN test: rejection flow check" } : {}),
    ...(c.status === "frozen" ? { notes: "FIN test: frozen workflow check" } : {}),
    history: historyFor(c),
    seedMarker: MARKER,
    createdAt: day(10),
    updatedAt: c.status === "paid" ? day(1) : c.status === "to_be_paid" ? day(3) : day(6),
  };
}

function invoiceIdFor(ref: NonNullable<FinClaimSeed["invoiceRef"]>): string {
  return ref === "INV-FIN-001" ? "fin_inv_001" : "fin_inv_002";
}

function buildInvoiceDocs(): Array<InvoiceDocument & { seedMarker: string }> {
  return FIN_INVOICES.map((inv) => {
    const claims = FIN_CLAIMS.filter((c) => c.invoiceRef === inv.invoiceRef);
    const lineItems: InvoiceLineItem[] = claims.map((c) => ({
      claimId: c.reimbursementId,
      claimNumber: c.claimNumber,
      amount: c.amount,
      sessionCount: c.sessionCount,
      serviceDate: c.serviceDate,
      bankAccountNumber: c.bankAccountNumber,
      bankName: c.bankName,
    }));
    const totalAmount = lineItems.reduce((sum, li) => sum + li.amount, 0);
    const dates = claims
      .map((c) => c.serviceDate)
      .filter((d): d is string => Boolean(d))
      .sort();
    const isIssued = inv.status === "issued" || inv.status === "paid";
    return {
      invoiceId: inv.invoiceId,
      tenantId: TENANT_ID,
      invoiceNumber: inv.invoiceNumber,
      period: { from: dates[0] ?? "2026-08-01", to: dates[dates.length - 1] ?? "2026-08-31" },
      status: inv.status,
      generatedBy: ACTOR_SUPER_ADMIN,
      generatedAt: day(12),
      ...(isIssued ? { issuedAt: day(10) } : {}),
      ...(inv.status === "paid" ? { paidAt: day(3), paidBy: ACTOR_SUPER_ADMIN } : {}),
      totalAmount,
      lineItems,
      seedMarker: MARKER,
      createdAt: day(12),
      updatedAt: inv.status === "paid" ? day(3) : isIssued ? day(10) : day(12),
    };
  });
}

function buildPaymentDocs(): Array<PaymentRecordDocument & { seedMarker: string }> {
  const payoutClaims = FIN_CLAIMS.filter(
    (c) => c.status === "to_be_paid" || c.status === "paid",
  );
  return payoutClaims.map((c) => {
    const paid = c.status === "paid";
    return {
      paymentRecordId: `fin_pay_${c.reimbursementId}`,
      tenantId: c.tenantId,
      claimId: c.reimbursementId,
      ...(c.invoiceRef ? { invoiceId: invoiceIdFor(c.invoiceRef) } : {}),
      amount: c.amount,
      status: paid ? ("paid" as const) : ("to_be_paid" as const),
      ...(paid
        ? {
            paymentReference: "FIN-PAY-0001",
            paidAt: day(1),
            paymentDate: day(1).slice(0, 10),
            paidBy: ACTOR_TENANT_ADMIN,
            method: "bank_transfer",
            notes: `Paid via bank transfer (${c.description})`,
          }
        : {}),
      seedMarker: MARKER,
      createdAt: day(3),
      updatedAt: paid ? day(1) : day(3),
    };
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<string[]> {
  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  const db = client.db(resolveDbName(MONGODB_URI!));

  // 1. Tenant - create ONLY if missing ($setOnInsert): never clobber the E2E
  //    demo's tenant document. If it already exists it stays untagged, so
  //    marker-scoped cleanup will not remove it.
  await db.collection("tenants").updateOne(
    { tenantId: TENANT_ID },
    {
      $setOnInsert: {
        tenantId: TENANT_ID,
        name: TENANT_NAME,
        slug: TENANT_SLUG,
        status: "active",
        plan: "pro",
        branding: {},
        seedMarker: MARKER,
        createdAt: NOW,
        updatedAt: NOW,
      },
    },
    { upsert: true },
  );

  // 2. Employees - $setOnInsert for the same reason.
  const employees = db.collection("employees");
  for (const e of FIN_EMPLOYEES) {
    await employees.updateOne(
      { employeeId: e.employeeId },
      {
        $setOnInsert: {
          employeeId: e.employeeId,
          tenantId: TENANT_ID,
          employeeCode: e.code,
          name: e.name,
          email: `${e.employeeId}@e2e-a.example.test`,
          status: "active",
          passwordHash: hash(EMPLOYEE_PASSWORD),
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastAccessAt: null,
          seedMarker: MARKER,
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
      { upsert: true },
    );
  }

  // 3. Claims - full replace on our own ids (idempotent re-runs).
  const claims = db.collection("reimbursements");
  for (const c of FIN_CLAIMS) {
    await claims.replaceOne({ reimbursementId: c.reimbursementId }, buildClaimDoc(c), {
      upsert: true,
    });
  }

  // 4. Invoices - lineItems ARE the claim relationship (read-time join).
  const invoices = db.collection("invoices");
  for (const inv of buildInvoiceDocs()) {
    await invoices.replaceOne({ invoiceId: inv.invoiceId }, inv, { upsert: true });
  }

  // 5. Payment records - one per payout-state claim.
  const payments = db.collection("paymentRecords");
  for (const p of buildPaymentDocs()) {
    await payments.replaceOne({ paymentRecordId: p.paymentRecordId }, p, { upsert: true });
  }

  // 6. Advance the SHARED claimNumber counter past our reserved RMB-2026-90xxxx
  //    block. $max only - the counter is NEVER rewound, so no live or future
  //    claim can be reissued one of our numbers.
  // `_id` is a string key here (CounterDocument in claimNumberService), so the
  // collection is typed explicitly to keep the filter's `_id` a string.
  await db.collection<{ _id: string; value: number }>("counters").updateOne(
    { _id: "claimNumber" },
    { $max: { value: CLAIM_NUMBER_RESERVE } },
    { upsert: true },
  );

  const failures = await validate(db);
  await client.close();
  return failures;
}

// ── Validation ───────────────────────────────────────────────────────────────

function testLabel(c: { description: string }): string {
  return c.description.split(" - ")[0] ?? c.description;
}

async function validate(db: Db): Promise<string[]> {
  const failures: string[] = [];

  // 1. Exact expected counts (also proves no duplicate marker records).
  const markerClaims = await db.collection("reimbursements").countDocuments({ seedMarker: MARKER });
  const markerInvoices = await db.collection("invoices").countDocuments({ seedMarker: MARKER });
  const expectedPayments = FIN_CLAIMS.filter(
    (c) => c.status === "to_be_paid" || c.status === "paid",
  ).length;
  const markerPayments = await db.collection("paymentRecords").countDocuments({ seedMarker: MARKER });
  if (markerClaims !== FIN_CLAIMS.length) {
    failures.push(`claim count ${markerClaims} != expected ${FIN_CLAIMS.length}`);
  }
  if (markerInvoices !== FIN_INVOICES.length) {
    failures.push(`invoice count ${markerInvoices} != expected ${FIN_INVOICES.length}`);
  }
  if (markerPayments !== expectedPayments) {
    failures.push(`payment record count ${markerPayments} != expected ${expectedPayments}`);
  }

  // 2. Tenant + employees exist.
  const tenant = await db.collection("tenants").findOne({ tenantId: TENANT_ID });
  if (!tenant) failures.push(`tenant ${TENANT_ID} missing`);
  const employeeIds = new Set(FIN_EMPLOYEES.map((e) => e.employeeId));

  // 3. Claims: uniqueness, tenant, employee, history consistency.
  const allClaims = await db.collection<StoredClaim>("reimbursements").find({ seedMarker: MARKER }).toArray();
  const claimIds = allClaims.map((c) => c.reimbursementId);
  if (new Set(claimIds).size !== claimIds.length) failures.push("duplicate claim ids");
  const claimNumbers = allClaims
    .map((c) => c.claimNumber)
    .filter((n): n is string => Boolean(n));
  if (new Set(claimNumbers).size !== claimNumbers.length) failures.push("duplicate claim numbers");
  for (const c of allClaims) {
    const label = testLabel(c);
    if (c.tenantId !== TENANT_ID) failures.push(`${label}: wrong tenant ${c.tenantId}`);
    if (!employeeIds.has(c.employeeId)) failures.push(`${label}: unknown employeeId ${c.employeeId}`);
    const history = c.history ?? [];
    if (history.length === 0 || history[history.length - 1].status !== c.status) {
      failures.push(
        `${label}: history tail (${history[history.length - 1]?.status ?? "none"}) != status ${c.status}`,
      );
    }
  }
  const claimById = new Map(allClaims.map((c) => [c.reimbursementId, c]));

  // 4. Invoices: totals, linkage, per-state relationship rules.
  const allInvoices = await db.collection<StoredInvoice>("invoices").find({ seedMarker: MARKER }).toArray();
  const linkedOnce = new Map<string, string>();
  for (const inv of allInvoices) {
    if (inv.tenantId !== TENANT_ID) failures.push(`${inv.invoiceId}: wrong tenant`);
    const lineSum = inv.lineItems.reduce((s, li) => s + li.amount, 0);
    if (lineSum !== inv.totalAmount) {
      failures.push(`${inv.invoiceNumber}: total ${inv.totalAmount} != lineItems sum ${lineSum}`);
    }
    for (const li of inv.lineItems) {
      const claim = claimById.get(li.claimId);
      if (!claim) {
        failures.push(`${inv.invoiceNumber}: lineItem ${li.claimId} has no claim document`);
        continue;
      }
      if (li.amount !== claim.amount) {
        failures.push(`${inv.invoiceNumber}: lineItem ${li.claimId} amount != claim amount`);
      }
      const previous = linkedOnce.get(li.claimId);
      if (previous) {
        failures.push(`${li.claimId}: linked to both ${previous} and ${inv.invoiceNumber}`);
      } else {
        linkedOnce.set(li.claimId, inv.invoiceNumber);
      }
    }
    if (inv.status === "issued") {
      for (const li of inv.lineItems) {
        const claim = claimById.get(li.claimId);
        if (claim && claim.status !== "approved") {
          failures.push(
            `${inv.invoiceNumber} (issued): claim ${testLabel(claim)} is ${claim.status}, expected approved (awaiting organization payment)`,
          );
        }
      }
    }
    if (inv.status === "paid") {
      for (const li of inv.lineItems) {
        const claim = claimById.get(li.claimId);
        if (claim && claim.status !== "to_be_paid" && claim.status !== "paid") {
          failures.push(
            `${inv.invoiceNumber} (paid): claim ${testLabel(claim)} is ${claim.status}, expected to_be_paid or paid`,
          );
        }
      }
    }
  }

  // 5. to_be_paid claims: must sit on a PAID invoice and have a payout record.
  for (const c of allClaims) {
    const label = testLabel(c);
    if (c.status === "to_be_paid") {
      const inv = allInvoices.find((i) => i.lineItems.some((li) => li.claimId === c.reimbursementId));
      if (!inv) {
        failures.push(`${label}: to_be_paid but not linked to any invoice`);
      } else if (inv.status !== "paid") {
        failures.push(`${label}: to_be_paid but linked invoice ${inv.invoiceNumber} is ${inv.status}`);
      }
      const payout = await db.collection<StoredPayment>("paymentRecords").findOne({ claimId: c.reimbursementId });
      if (!payout) {
        failures.push(`${label}: to_be_paid but no paymentRecords entry`);
      } else if (payout.status !== "to_be_paid") {
        failures.push(`${label}: paymentRecords status ${payout.status} != to_be_paid`);
      } else if (payout.amount !== c.amount) {
        failures.push(`${label}: paymentRecords amount ${payout.amount} != claim amount ${c.amount}`);
      }
    }
    if (c.status === "paid") {
      const payout = await db.collection<StoredPayment>("paymentRecords").findOne({ claimId: c.reimbursementId });
      if (!payout) {
        failures.push(`${label}: paid but no paymentRecords entry (Payment History would miss it)`);
      } else if (payout.status !== "paid") {
        failures.push(`${label}: paymentRecords status ${payout.status} != paid`);
      } else if (!payout.paymentReference || !payout.paidAt) {
        failures.push(`${label}: paid paymentRecord missing paymentReference/paidAt`);
      }
    }
  }

  // 6. Payment records: claim + invoice references resolve.
  const allPayments = await db.collection<StoredPayment>("paymentRecords").find({ seedMarker: MARKER }).toArray();
  for (const p of allPayments) {
    if (!claimById.has(p.claimId)) {
      failures.push(`paymentRecord ${p.paymentRecordId}: claimId ${p.claimId} unresolved`);
    }
    if (p.invoiceId && !allInvoices.some((i) => i.invoiceId === p.invoiceId)) {
      failures.push(`paymentRecord ${p.paymentRecordId}: invoiceId ${p.invoiceId} unresolved`);
    }
  }

  return failures;
}

// ── Output ───────────────────────────────────────────────────────────────────

const STATE_LABELS: Record<FinClaimSeed["status"], string> = {
  pending: "Pending",
  in_progress: "In Progress",
  approved: "Approved",
  to_be_paid: "Ready to Pay",
  rejected: "Rejected",
  frozen: "Frozen",
  paid: "Paid",
};

function printClaimsTable(): void {
  console.log("\nFINANCIAL STATE TEST DATA\n");
  console.log("ID                  STATE              AMOUNT    PURPOSE");
  console.log("---------------------------------------------------------------");
  for (const c of FIN_CLAIMS) {
    const id = testLabel(c).padEnd(20);
    const state = (STATE_LABELS[c.status] ?? c.status).padEnd(19);
    console.log(`${id}${state}${String(c.amount).padEnd(10)}${c.purpose}`);
  }
  console.log(`\n  Claim count: ${FIN_CLAIMS.length}`);
  console.log("  Claim number block: RMB-2026-900001..RMB-2026-900014 (counter advanced past 900100, never rewound)");
}

function printInvoiceData(): void {
  console.log("\nINVOICE TEST DATA\n");
  for (const inv of FIN_INVOICES) {
    const claims = FIN_CLAIMS.filter((c) => c.invoiceRef === inv.invoiceRef);
    const total = claims.reduce((s, c) => s + c.amount, 0);
    console.log(`${inv.invoiceRef}`);
    console.log(`  Invoice ID:   ${inv.invoiceId}`);
    console.log(`  Number:       ${inv.invoiceNumber}`);
    console.log(`  Claims:       ${claims.map(testLabel).join(", ")}`);
    console.log(`  Status:       ${inv.status}`);
    console.log(`  Amount:       ${total}`);
    console.log(`  Meaning:      ${inv.meaning}`);
  }
}

function printPaymentData(): void {
  console.log("\nPAYMENT RECORD TEST DATA\n");
  for (const c of FIN_CLAIMS) {
    if (c.status !== "to_be_paid" && c.status !== "paid") continue;
    const paid = c.status === "paid";
    console.log(
      `  fin_pay_${c.reimbursementId}  claim=${testLabel(c).padEnd(13)} status=${(paid ? "paid" : "to_be_paid").padEnd(11)} amount=${String(c.amount).padEnd(5)}${paid ? " ref=FIN-PAY-0001 (Payment History)" : "(Ready to Pay queue)"}`,
    );
  }
}

function printIds(): void {
  console.log("\nIDS / RELATIONSHIPS\n");
  console.log(`  Tenant:       ${TENANT_ID}  (${TENANT_NAME}, slug=${TENANT_SLUG})`);
  console.log(`  Employees:    ${FIN_EMPLOYEES.map((e) => `${e.employeeId} (${e.name})`).join("; ")}`);
  console.log(`  Claim IDs:    ${FIN_CLAIMS.map((c) => c.reimbursementId).join(", ")}`);
  console.log(`  Invoice IDs:  ${FIN_INVOICES.map((i) => i.invoiceId).join(", ")}`);
  console.log(
    `  Payment IDs:  ${FIN_CLAIMS.filter((c) => c.status === "to_be_paid" || c.status === "paid")
      .map((c) => `fin_pay_${c.reimbursementId}`)
      .join(", ")}`,
  );
  console.log("\n  NOTE: FIN-006 / Group A claims stay status=approved on the issued invoice -");
  console.log('  "Awaiting Organization Payment" is derived from the invoice linkage.');
}

function printManualTestOrder(): void {
  console.log("\nRECOMMENDED MANUAL TEST ORDER\n");
  console.log(" 1. Open Claims - inspect all statuses and default visibility.");
  console.log(" 2. Open FIN-FULL-001 - progress it manually from Pending.");
  console.log(" 3. Approve FIN-FULL-001 - inspect where it appears next.");
  console.log(" 4. Generate its invoice - inspect Invoice Detail.");
  console.log(" 5. Issue the invoice - inspect Awaiting Organization Payment.");
  console.log(" 6. Record organization payment - inspect invoice, claim, dashboard,");
  console.log("    Payments, Ready to Pay.");
  console.log(" 7. Record claimant/clinic payment - inspect Ready to Pay, Paid, Payment History.");
  console.log(" 8. Repeat with FIN-PARTIAL-001 but stop at each intermediate state.");
  console.log(" 9. Inspect FIN-006 - all screens for Awaiting Organization Payment.");
  console.log("10. Inspect FIN-007 - all screens for Ready to Pay.");
  console.log("11. Inspect FIN-008 - Paid / Payment History.");
  console.log("12. Inspect FIN-HIGH-001 - large-session claim UI.");
  console.log("\n  The script creates ONLY starting states - the golden path is manual.");
}

// ── Runner ───────────────────────────────────────────────────────────────────

main()
  .then((failures) => {
    console.log("\n=========================================");
    console.log(" FINANCIAL STATE TEST SEED - DEVELOPMENT ONLY");
    console.log("=========================================");
    console.log('Markers: every record carries seedMarker="financial-state-test".');
    console.log("Cleanup: npx tsx --env-file=.env.local scripts/cleanup-financial-state-test.ts --allow-dev");
    printClaimsTable();
    printInvoiceData();
    printPaymentData();
    printIds();
    printManualTestOrder();
    if (failures.length > 0) {
      console.error("\nVALIDATION: FAIL");
      for (const f of failures) console.error(`  - ${f}`);
      process.exit(1);
    }
    console.log("\nVALIDATION: PASS");
  })
  .catch((e: unknown) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
