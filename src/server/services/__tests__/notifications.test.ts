import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  listForRecipient,
  markAllRead,
  markRead,
  notify,
  unreadCount,
} from "@/src/server/services/notificationService";

const TENANT_ID = "tenant-notif-test";
const EMPLOYEE_ID = "emp-notif-test-1";

async function seedNotification(overrides: Record<string, unknown> = {}) {
  await notify({
    tenantId: TENANT_ID,
    claimId: "reimb_notif_test",
    claimNumber: "RMB-2026-000001",
    recipientType: "employee",
    recipientId: EMPLOYEE_ID,
    type: "claim_approved",
    title: "Claim approved",
    body: "Your claim has been approved.",
    ...overrides,
  });
}

describe("Notifications", () => {
  it("notify creates an unread notification for the recipient", async () => {
    await seedNotification();
    const count = await unreadCount(TENANT_ID, "employee", EMPLOYEE_ID);
    assert.ok(count >= 1, "expected at least one unread notification");
  });

  it("listForRecipient returns notifications for the recipient only", async () => {
    const list = await listForRecipient({
      tenantId: TENANT_ID,
      recipientType: "employee",
      recipientId: EMPLOYEE_ID,
      limit: 100,
    });
    assert.ok(list.length >= 1);
    assert.ok(
      list.every((n) => n.recipientId === EMPLOYEE_ID && n.recipientType === "employee"),
    );
  });

  it("listForRecipient is scoped to tenant and does not leak other tenants", async () => {
    await seedNotification();
    const other = await listForRecipient({
      tenantId: "tenant-notif-other",
      recipientType: "employee",
      recipientId: EMPLOYEE_ID,
    });
    assert.equal(other.length, 0);
  });

  it("markRead is scoped to recipient and marks a single notification read", async () => {
    await seedNotification({ body: "mark-read-target" });
    const list = await listForRecipient({
      tenantId: TENANT_ID,
      recipientType: "employee",
      recipientId: EMPLOYEE_ID,
      unreadOnly: true,
      limit: 100,
    });
    const target = list.find((n) => n.body === "mark-read-target");
    assert.ok(target, "expected seeded notification");

    const wrongRecipient = await markRead(target!.notificationId, TENANT_ID, "employee", "emp-other");
    assert.equal(wrongRecipient, null, "markRead must be scoped to the recipient");

    const read = await markRead(target!.notificationId, TENANT_ID, "employee", EMPLOYEE_ID);
    assert.ok(read);
    assert.equal(read!.read, true);
  });

  it("markAllRead marks every notification read", async () => {
    await seedNotification({ body: "mark-all-a" });
    await seedNotification({ body: "mark-all-b" });
    const count = await markAllRead(TENANT_ID, "employee", EMPLOYEE_ID);
    const remaining = await unreadCount(TENANT_ID, "employee", EMPLOYEE_ID);
    assert.equal(remaining, 0);
    assert.ok(count >= 1);
  });

  it("supports platform-wide super admin notifications across tenants", async () => {
    await notify({
      tenantId: "", // platform-wide
      claimId: "reimb_super",
      claimNumber: "RMB-2026-000999",
      recipientType: "superAdmin",
      recipientId: "super-admin",
      type: "claim_approved",
      title: "Claim approved",
      body: "Ready for payout",
    });

    const list = await listForRecipient({
      tenantId: "",
      recipientType: "superAdmin",
      recipientId: "super-admin",
    });
    const found = list.find((n) => n.claimId === "reimb_super");
    assert.ok(found, "super admin should see platform-wide notifications");

    const count = await unreadCount("", "superAdmin", "super-admin");
    assert.ok(count >= 1);
  });
});
