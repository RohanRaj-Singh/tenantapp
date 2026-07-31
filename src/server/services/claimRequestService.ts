import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { notify, notifyTenantAdmins } from "@/src/server/services/notificationService";
import {
  assertClaimAccess,
  postChatMessage,
  type ChatAccessContext,
} from "@/src/server/services/claimMessageService";
import type { ClaimRequestDocument } from "@/src/server/db/documents";

export type ClaimRequestDecision = "approved" | "rejected" | "more_info" | "converted_to_chat";

async function fireRequestNotification(dispatch: () => Promise<void>) {
  try {
    await dispatch();
  } catch (error) {
    console.error("[requests] failed to create notification:", error);
  }
}

function decisionLabel(decision: ClaimRequestDecision): string {
  switch (decision) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "more_info":
      return "Needs more info";
    case "converted_to_chat":
      return "Converted to chat";
  }
}

export interface CreateClaimRequestInput {
  subject: string;
  details: string;
}

export async function createClaimRequest(
  context: ChatAccessContext,
  claimId: string,
  input: CreateClaimRequestInput,
): Promise<ClaimRequestDocument | null> {
  const claim = await assertClaimAccess(context, claimId);
  if (!claim) {
    return null;
  }

  const subject = input.subject?.trim();
  const details = input.details?.trim();
  if (!subject || !details) {
    return null;
  }

  const now = new Date().toISOString();
  const request: ClaimRequestDocument = {
    requestId: `req_${randomUUID()}`,
    tenantId: claim.tenantId,
    claimId,
    requester: context.participant,
    subject,
    details,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const repositories = await getRepositoryContext();
  await repositories.claimRequests.insert(request);

  // Employee/org requests land with the tenant admin for review
  const reference = claim.claimNumber ?? claim.reimbursementId;
  if (context.participant.role === "employee" || context.participant.role === "clinic") {
    await fireRequestNotification(() =>
      notifyTenantAdmins({
        tenantId: claim.tenantId,
        claimId: claim.reimbursementId,
        claimNumber: claim.claimNumber,
        type: "claim_request",
        title: "New request",
        body: `${context.participant.name} asked on ${reference}: ${subject}`,
      }),
    );
  }

  return request;
}

export async function listClaimRequests(
  context: ChatAccessContext,
  claimId: string,
): Promise<ClaimRequestDocument[] | null> {
  const claim = await assertClaimAccess(context, claimId);
  if (!claim) {
    return null;
  }

  const repositories = await getRepositoryContext();
  return repositories.claimRequests.listByClaimId(claimId);
}

export async function decideClaimRequest(
  context: ChatAccessContext,
  claimId: string,
  requestId: string,
  decision: ClaimRequestDecision,
  note?: string,
): Promise<ClaimRequestDocument | null> {
  const claim = await assertClaimAccess(context, claimId);
  if (!claim) {
    return null;
  }

  // Only the tenant admin (organization) decides requests
  if (context.participant.role !== "tenantAdmin") {
    return null;
  }

  const repositories = await getRepositoryContext();
  const existing = await repositories.claimRequests.findById(requestId);
  if (!existing || existing.claimId !== claimId) {
    return null;
  }
  if (existing.status !== "pending") {
    return null;
  }

  const now = new Date().toISOString();
  const trimmedNote = note?.trim();

  if (decision === "converted_to_chat") {
    // Seed a chat thread with the request context, then mark the request converted
    const seeded = await postChatMessage(
      context,
      claimId,
      `Converted request "${existing.subject}" to chat — ${existing.details}`,
    );
    if (!seeded) {
      return null;
    }
    return repositories.claimRequests.update(requestId, {
      status: "converted_to_chat",
      decisionBy: context.participant.key,
      decidedAt: now,
      convertedToMessageId: seeded.messageId,
      updatedAt: now,
      ...(trimmedNote ? { decisionNote: trimmedNote } : {}),
    });
  }

  const updated = await repositories.claimRequests.update(requestId, {
    status: decision,
    decisionBy: context.participant.key,
    decidedAt: now,
    updatedAt: now,
    ...(trimmedNote ? { decisionNote: trimmedNote } : {}),
  });

  if (updated) {
    const reference = claim.claimNumber ?? claim.reimbursementId;
    const label = decisionLabel(decision);
    await fireRequestNotification(() =>
      notify({
        tenantId: claim.tenantId,
        claimId: claim.reimbursementId,
        claimNumber: claim.claimNumber,
        recipientType: "employee",
        recipientId: claim.employeeId,
        type: "claim_request",
        title: `Request ${label}`,
        body: `Your request "${existing.subject}" on ${reference} was ${label.toLowerCase()}.${
          trimmedNote ? ` ${trimmedNote}` : ""
        }`,
      }),
    );
  }

  return updated;
}
