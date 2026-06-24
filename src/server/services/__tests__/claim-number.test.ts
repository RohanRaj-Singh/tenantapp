import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateClaimNumber } from "@/src/server/services/claimNumberService";

const CLAIM_NUMBER_REGEX = /^RMB-\d{4}-\d{6}$/;

describe("Claim Number Service", () => {
  it("generates a claim number in RMB-YYYY-NNNNNN format", async () => {
    const claimNumber = await generateClaimNumber();
    assert.match(claimNumber, CLAIM_NUMBER_REGEX, `Invalid format: ${claimNumber}`);
  });

  it("includes the current year", async () => {
    const claimNumber = await generateClaimNumber();
    const year = new Date().getFullYear().toString();
    const parts = claimNumber.split("-");
    assert.equal(parts[1], year, `Expected year ${year} in "${claimNumber}"`);
  });

  it("zero-pads the sequence to exactly 6 digits", async () => {
    const claimNumber = await generateClaimNumber();
    const parts = claimNumber.split("-");
    assert.equal(parts.length, 3, `Expected 3 dash-separated parts in "${claimNumber}"`);
    assert.equal(parts[2]!.length, 6, `Expected 6-digit sequence in "${claimNumber}"`);
    assert.match(parts[2]!, /^\d{6}$/, `Sequence must be numeric digits: "${parts[2]}"`);
  });

  it("increments the sequence on each call", async () => {
    const first = await generateClaimNumber();
    const second = await generateClaimNumber();

    const firstSeq = parseInt(first.split("-")[2]!, 10);
    const secondSeq = parseInt(second.split("-")[2]!, 10);

    assert.equal(secondSeq, firstSeq + 1, "Sequence must increment by 1 on each call");
  });

  it("generates unique numbers across concurrent calls", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => generateClaimNumber()),
    );
    const unique = new Set(results);
    assert.equal(unique.size, results.length, `Expected 5 unique claim numbers, got: ${results.join(", ")}`);
  });
});
