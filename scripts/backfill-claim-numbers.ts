/**
 * Backfill script: assign claim reference numbers to existing claims that predate
 * the Phase 5H release.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... tsx scripts/backfill-claim-numbers.ts
 *
 * Idempotent: claims that already have a claimNumber are skipped.
 * Counter state is shared with the live app — future claims continue from where
 * this script leaves off, so there are no gaps or duplicates.
 */

import { MongoClient, ServerApiVersion } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const CLAIM_PREFIX = "RMB";
const COUNTER_ID = "claimNumber";
const LOG_INTERVAL = 50;

if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI environment variable is required.");
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
    const reimbursements = db.collection("reimbursements");
    const counters = db.collection("counters");

    // Collect claims that have no claimNumber, ordered oldest-first so historical
    // assignments match the creation timeline as closely as possible.
    const toUpdate = await reimbursements
      .find(
        { claimNumber: { $exists: false } },
        { projection: { reimbursementId: 1, createdAt: 1 } },
      )
      .sort({ createdAt: 1 })
      .toArray();

    console.log(`Found ${toUpdate.length} claims to backfill.`);

    if (toUpdate.length === 0) {
      console.log("Nothing to do.");
      return;
    }

    let updated = 0;

    for (const doc of toUpdate) {
      // Atomically claim the next sequence number — same pattern used by the live app.
      const result = await counters.findOneAndUpdate(
        { _id: COUNTER_ID },
        { $inc: { value: 1 } },
        { returnDocument: "after", upsert: true },
      );

      const sequence = (result?.value as number) ?? 1;
      const year = new Date(doc.createdAt as string).getFullYear();
      const padded = String(sequence).padStart(6, "0");
      const claimNumber = `${CLAIM_PREFIX}-${year}-${padded}`;

      await reimbursements.updateOne(
        { reimbursementId: doc.reimbursementId },
        { $set: { claimNumber } },
      );

      updated++;

      if (updated % LOG_INTERVAL === 0) {
        console.log(`  Backfilled ${updated} / ${toUpdate.length}…`);
      }
    }

    console.log(`Done. Assigned claim numbers to ${updated} claims.`);
  } finally {
    await client.close();
  }
}

main().catch((err: unknown) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
