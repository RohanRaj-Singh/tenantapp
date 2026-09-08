/**
 * Runtime E2E verification of the complete financial workflow (Phase 6).
 *
 * Runs the full `CLAIMS → INVOICES → TO_BE_PAID → PAYMENTS → PAID` chain against
 * the REAL local MongoDB (the same `MONGODB_URI` the app uses), exercising the
 * real service + repository + state-machine + PaymentRecord ledger code paths —
 * not the in-memory test store.
 *
 * The five hardening fixes are verified live:
 *   1. `processPayments` rejects a `to_be_paid` claim missing its bank snapshot.
 *   2. `processPayments` de-duplicates claim ids (no mid-batch abort).
 *   3. `markInvoicePaid` queues claims and records `paidBy` on the invoice.
 *   4. Empty/absent `claimIds` → `NO_CLAIMS_SELECTED`.
 *   5. Cross-organization claims are rejected when `tenantId` is scoped.
 *
 * Run:  npx tsx --env-file=.env.local scripts/runtime-e2e-financial.ts
 *
 * Creates persistent, clearly-prefixed `runtime-e2e-*` test data so the results
 * can be inspected in MongoDB after the run.
 */
import assert from "node:assert/strict";
import { MongoClient } from "mongodb";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { createEmployee } from "@/src/server/services/employeeService";
import {
  createReimbursement,
  createEmployeeReimbursement,
  approveReimbursement,
  markInProgress,
} from "@/src/server/services/reimbursementService";
import {
  queueForPayment,
  processPayments,
  listPaymentOperations,
  getPaymentDetail,
} from "@/src/server/services/paymentService";
import {
  generateInvoice,
  issueInvoice,
  markInvoicePaid,
} from "@/src/server/services/invoiceService";

const ACTOR = "super-admin";
const RUN = Date.now();
const ORG_A = `runtime-e2e-org-a-${RUN}`;
const ORG_B = `runtime-e2e-org-b-${RUN}`;
const CLINIC_A = { clinicId: `clinic-a-${RUN}`, clinicName: "Org A Clinic" };

function resolveDbName(uri: string): string {
  try {
    return new URL(uri).pathname.replace(/^\/+/, "") || "remedygcc";
  } catch {
    return "remedygcc";
  }
}

let step = 0;
function ok(label: string, detail?: string) {
  step += 1;
  console.log(`PASS ${String(step).padStart(2)}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function approveClaim(tenantId: string, claimId: string) {
  await markInProgress(tenantId, claimId, ACTOR);
  return approveReimbursement(tenantId, claimId, ACTOR);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  assert.ok(uri, "MONGODB_URI must be set (run with --env-file=.env.local)");

  // ── 0. Environment: prove we are talking to the real MongoDB ───────────────
  const client = new MongoClient(uri);
  await client.connect();
  await client.db(resolveDbName(uri)).command({ ping: 1 });
  ok("environment", `real MongoDB reachable (${resolveDbName(uri)} @ ${new URL(uri).hostname})`);

  const repositories = await getRepositoryContext();
  ok("environment", "repository context resolved (MONGODB_URI set, no in-memory fallback)");

  // ── 1. Seed Org A / Clinic A / Employee A + claims ────────────────────────
  const empA = await createEmployee(ORG_A, {
    employeeCode: `E2E-${RUN}`,
    email: `e2e-${RUN}@example.com`,
    bankAccountNumber: "EMP-PROFILE-ACCT",
    bankName: "Bank Muscat",
  });
  assert.ok(empA.employeeId, "employee A created");
  ok("seed", `Employee A created (${empA.employeeId})`);

  // Two bank-complete claims (happy path) + one bank-missing claim (blocked path).
  const c1 = await createEmployeeReimbursement(ORG_A, empA.employeeId, "E2E Employee A", {
    ...CLINIC_A,
    amount: 125,
    description: "Runtime E2E claim C1",
    bankAccountNumber: "ACCT-C1",
    bankName: "Bank Dhofar",
  });
  const c2 = await createEmployeeReimbursement(ORG_A, empA.employeeId, "E2E Employee A", {
    ...CLINIC_A,
    amount: 75,
    description: "Runtime E2E claim C2",
    bankAccountNumber: "ACCT-C2",
    bankName: "Bank Dhofar",
  });
  const c3 = await createReimbursement(ORG_A, {
    employeeId: empA.employeeId,
    employeeName: "E2E Employee A",
    type: "medical",
    amount: 200,
    description: "Runtime E2E claim C3 (no bank)",
  });
  ok("seed", `Claims C1/C2 (bank-complete) + C3 (bank-missing) created`);

  // ── 2. Approve the happy-path claims through the legal state machine ───────
  await approveClaim(ORG_A, c1.reimbursementId);
  await approveClaim(ORG_A, c2.reimbursementId);
  ok("state", "C1, C2 approved (pending → in_progress → approved)");

  // ── 3. Invoice settlement: generate → issue → pay (auto-queues) ────────────
  const invoice = await generateInvoice({
    tenantId: ORG_A,
    claimIds: [c1.reimbursementId, c2.reimbursementId],
    generatedBy: ACTOR,
  });
  const issued = await issueInvoice(invoice.invoiceId, ACTOR);
  const paidInvoice = await markInvoicePaid(issued.invoiceId, ACTOR);
  assert.equal(paidInvoice.status, "paid");
  assert.equal(paidInvoice.paidBy, ACTOR, "invoice paidBy must be persisted (Finding #4)");
  ok("invoice", `invoice ${invoice.invoiceNumber} issued → paid (paidBy recorded)`);

  // Claims are auto-queued by markInvoicePaid.
  const repoAfterInvoice = await getRepositoryContext();
  const q1 = await repoAfterInvoice.reimbursements.findById(c1.reimbursementId);
  const q2 = await repoAfterInvoice.reimbursements.findById(c2.reimbursementId);
  assert.equal(q1!.status, "to_be_paid");
  assert.equal(q2!.status, "to_be_paid");
  ok("state", "markInvoicePaid auto-queued C1, C2 (approved → to_be_paid)");

  // ── 4. Payout happy path (explicit selection + full reconciliation fields) ──
  const payout = await processPayments({
    claimIds: [c1.reimbursementId, c2.reimbursementId],
    actorId: ACTOR,
    bankReference: "TRF-E2E-001",
    notes: "Runtime E2E payout",
    paymentDate: "2026-08-26",
    method: "Bank transfer",
  });
  assert.equal(payout.processed, 2);
  assert.deepEqual(payout.rejected, []);
  ok("payout", "processPayments paid C1 + C2 (processed=2, rejected=[])");

  const repoAfterPayout = await getRepositoryContext();
  const paid1 = await repoAfterPayout.reimbursements.findById(c1.reimbursementId);
  const rec1 = await repoAfterPayout.paymentRecords.findByClaimId(c1.reimbursementId);
  assert.equal(paid1!.status, "paid");
  assert.equal(rec1!.status, "paid");
  assert.equal(rec1!.paidBy, ACTOR);
  assert.match(rec1!.paymentReference ?? "", /^PAY-\d{4}-\d{6}$/);
  assert.equal(rec1!.bankReference, "TRF-E2E-001");
  assert.equal(rec1!.notes, "Runtime E2E payout");
  assert.equal(rec1!.paymentDate, "2026-08-26");
  assert.equal(rec1!.method, "Bank transfer");
  assert.equal(rec1!.invoiceId, invoice.invoiceId, "invoiceId preserved on ledger");
  ok(
    "ledger",
    "PaymentRecord finalized: status=paid, paymentReference/bankReference/notes/paymentDate/method/invoiceId all preserved",
  );

  // ── 5. Blocked path: bank-missing claim is rejected, not paid ──────────────
  await approveClaim(ORG_A, c3.reimbursementId);
  await queueForPayment(ORG_A, c3.reimbursementId, ACTOR);
  const blocked = await processPayments({ claimIds: [c3.reimbursementId], actorId: ACTOR });
  assert.equal(blocked.processed, 0);
  assert.deepEqual(blocked.rejected, [{ claimId: c3.reimbursementId, reason: "missing_bank" }]);
  const c3After = await (await getRepositoryContext()).reimbursements.findById(c3.reimbursementId);
  assert.equal(c3After!.status, "to_be_paid", "bank-missing claim stays to_be_paid");
  ok("blocked", "C3 (missing bank) rejected with reason=missing_bank (Finding #1)");

  // ── 6. Dedupe: duplicate ids do not abort the batch (Finding #2) ───────────
  const c4 = await createEmployeeReimbursement(ORG_A, empA.employeeId, "E2E Employee A", {
    ...CLINIC_A,
    amount: 50,
    description: "Runtime E2E claim C4",
    bankAccountNumber: "ACCT-C4",
    bankName: "Bank Dhofar",
  });
  const c5 = await createEmployeeReimbursement(ORG_A, empA.employeeId, "E2E Employee A", {
    ...CLINIC_A,
    amount: 60,
    description: "Runtime E2E claim C5",
    bankAccountNumber: "ACCT-C5",
    bankName: "Bank Dhofar",
  });
  await approveClaim(ORG_A, c4.reimbursementId);
  await approveClaim(ORG_A, c5.reimbursementId);
  await queueForPayment(ORG_A, c4.reimbursementId, ACTOR);
  await queueForPayment(ORG_A, c5.reimbursementId, ACTOR);

  const deduped = await processPayments({
    claimIds: [c4.reimbursementId, c5.reimbursementId, c4.reimbursementId],
    actorId: ACTOR,
  });
  assert.equal(deduped.processed, 2);
  assert.deepEqual(deduped.rejected, []);
  const c4After = await (await getRepositoryContext()).reimbursements.findById(c4.reimbursementId);
  const c5After = await (await getRepositoryContext()).reimbursements.findById(c5.reimbursementId);
  assert.equal(c4After!.status, "paid");
  assert.equal(c5After!.status, "paid");
  ok("dedupe", "[C4, C5, C4] → processed=2, no double-pay / abort");

  // ── 7. Cross-org: a claim from Org B is rejected under Org A scope ─────────
  const empB = await createEmployee(ORG_B, {
    employeeCode: `E2EB-${RUN}`,
    email: `e2eb-${RUN}@example.com`,
  });
  const c6 = await createEmployeeReimbursement(ORG_B, empB.employeeId, "E2E Employee B", {
    clinicId: `clinic-b-${RUN}`,
    clinicName: "Org B Clinic",
    amount: 90,
    description: "Runtime E2E claim C6",
    bankAccountNumber: "ACCT-C6",
    bankName: "Bank B",
  });
  await approveClaim(ORG_B, c6.reimbursementId);
  await queueForPayment(ORG_B, c6.reimbursementId, ACTOR);

  const crossOrg = await processPayments({
    tenantId: ORG_A,
    claimIds: [c6.reimbursementId],
    actorId: ACTOR,
  });
  assert.equal(crossOrg.processed, 0);
  assert.deepEqual(crossOrg.rejected, [{ claimId: c6.reimbursementId, reason: "wrong_organization" }]);
  ok("cross-org", "Org B claim rejected under Org A scope (reason=wrong_organization)");

  // ── 8. Empty selection must never pay "all eligible" (Finding: empty safety) ─
  await assert.rejects(() => processPayments({ actorId: ACTOR }), { code: "NO_CLAIMS_SELECTED" });
  await assert.rejects(() => processPayments({ claimIds: [], actorId: ACTOR }), { code: "NO_CLAIMS_SELECTED" });
  ok("empty-selection", "absent + empty claimIds → NO_CLAIMS_SELECTED");

  // ── 9. Refresh consistency: workspace reflects the drained queue ───────────
  const workspace = await listPaymentOperations({ tenantId: ORG_A });
  assert.equal(workspace.summary.outstanding.count, 1, "only C3 remains outstanding");
  assert.equal(workspace.summary.outstanding.amount, 200);
  const paidHistoryIds = new Set(workspace.paymentHistory.map((h) => h.claimId));
  assert.ok(paidHistoryIds.has(c1.reimbursementId));
  assert.ok(paidHistoryIds.has(c2.reimbursementId));
  assert.ok(paidHistoryIds.has(c4.reimbursementId));
  assert.ok(paidHistoryIds.has(c5.reimbursementId));
  assert.equal(workspace.paymentHistory.length, 4);
  ok("refresh", "workspace: outstanding=1 (C3), paymentHistory=4 paid claims");

  // ── 10. Traceability: single-payment detail resolves claim + invoice ───────
  const detail = await getPaymentDetail(c1.reimbursementId);
  assert.equal(detail.paymentRecord!.status, "paid");
  assert.equal(detail.claim!.status, "paid");
  assert.equal(detail.claim!.bankAccountNumber, "ACCT-C1", "claim snapshot carries bank");
  assert.equal(detail.invoiceNumber, invoice.invoiceNumber);
  // `tenantName` is a read-time join onto an actual tenant document; this run
  // seeds claims under a synthetic tenantId (no tenant record), so it is undefined.
  ok("traceability", `getPaymentDetail(C1): record=paid, claim=paid (bank=ACCT-C1), invoice=${invoice.invoiceNumber}`);

  // ── 11. Direct Mongo read: prove physical persistence (not in-memory) ──────
  const db = client.db(resolveDbName(uri));
  const mongoClaim = await db.collection("reimbursements").findOne({ reimbursementId: c1.reimbursementId });
  const mongoRecord = await db.collection("paymentRecords").findOne({ claimId: c1.reimbursementId });
  assert.equal(mongoClaim?.status, "paid");
  assert.equal(mongoRecord?.status, "paid");
  assert.ok(mongoRecord?.paymentReference, "ledger paymentReference physically persisted");
  ok("persistence", "MongoDB documents confirmed: claim=paid, PaymentRecord=paid");

  await client.close();
  console.log(`\nALL ${step} RUNTIME E2E STEPS PASSED  (tenant ${ORG_A} / ${ORG_B})`);
  // The repository layer's dev MongoClient keeps a pooled connection alive for the
  // app's lifetime; a script has no close handle on it, so exit explicitly.
  process.exit(0);
}

main().catch((error) => {
  console.error("\nRUNTIME E2E FAILED");
  console.error(error);
  process.exit(1);
});
