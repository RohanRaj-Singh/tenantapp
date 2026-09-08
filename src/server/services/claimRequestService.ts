import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { notify, notifyTenantAdmins } from "@/src/server/services/notificationService";
import {
  assertClaimAccess,
  postChatMessage,
  type ChatAccessContext,
} from "@/src/server/services/claimMessageService";
import { getHub } from "@/src/server/realtime/hub";
import type {
  ClaimRequestDocument,
  ClaimRequestParticipant,
  ClaimRequestStatus,
} from "@/src/server/db/documents";

export interface CreateClaimRequestInput {
  subject: string;
  body: string;
}

export interface ListClaimRequestsResult {
  requests: ClaimRequestDocument[];
}

/**
 * Tenant-wide Requests listing used by the `/requests` inbox. Read-only —
 * returns existing claimRequest documents scoped to the caller's tenantId.
 * Only the organization (tenant admin) of the same tenant may list.
 */
export async function listClaimRequestsForTenant(
  context: ChatAccessContext,
  options?: { status?: ClaimRequestStatus; limit?: number },
): Promise<ListClaimRequestsResult | null> {
  if (context.participant.role !== "tenantAdmin") {
    return null;
  }
  if (!context.tenantId) {
    return null;
  }
  const repositories = await getRepositoryContext();
  const requests = await repositories.claimRequests.listByTenantId(
    context.tenantId,
    options,
  );
  return { requests };
}

/**
 * A "Request" (FR-073/FR-074) is when an employee or clinic asks the organization
 * whether something is possible before proceeding with a claim (e.g. "Can we do an
 * assessment that costs 1000?"). The organization (tenant admin) can then respond:
 * approve, reject, ask for more info, or convert the discussion to chat.
 */
export async function createClaimRequest(
  context: ChatAccessContext,
  claimId: string,
  input: CreateClaimRequestInput,
): Promise<ClaimRequestDocument | null> {
  const claim = await assertClaimAccess(context, claimId);
  if (!claim) {
    return null;
  }

  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject || !body) {
    return null;
  }
  if (subject.length > 200 || body.length > 2000) {
    return null;
  }

  const now = new Date().toISOString();
  const requester: ClaimRequestParticipant = {
    role: context.participant.role as ClaimRequestParticipant["role"],
    id: context.participant.id,
    name: context.participant.name,
    key: context.participant.key,
  };

  const request: ClaimRequestDocument = {
    requestId: `req_${randomUUID()}`,
    tenantId: claim.tenantId,
    claimId,
    claimNumber: claim.claimNumber,
    subject,
    body,
    status: "pending",
    requester,
    createdAt: now,
    updatedAt: now,
  };

  const repositories = await getRepositoryContext();
  await repositories.claimRequests.insert(request);

  // Notify the organization (tenant admin) that a new request needs their answer.
  await fireSideEffect(() =>
    notifyTenantAdmins({
      tenantId: claim.tenantId,
      claimId: claim.reimbursementId,
      claimNumber: claim.claimNumber,
      type: "claim_request",
      title: "New request",
      body: `${requester.name} asked on ${subject}: ${body}`,
      requestId: request.requestId,
    }),
  );

  // Additive — also fan-out to the platform-wide Super Admin identity so the
  // Super Admin Requests workspace can deep-link from the bell.
  // Existing tenant-admin recipient is preserved unchanged.
  await fireSideEffect(() =>
    notify({
      tenantId: "",
      claimId: claim.reimbursementId,
      claimNumber: claim.claimNumber,
      recipientType: "superAdmin",
      recipientId: "super-admin",
      type: "claim_request",
      title: "New request",
      body: `${requester.name} asked on ${subject}: ${body}`,
      requestId: request.requestId,
    }),
  );

  // PA8: broadcast request.updated on creation so any open admin/employee UI
  // showing a request list refreshes instantly.
  const hub = getHub();
  const requestCreatedPayload = {
    requestId: request.requestId,
    claimId: claim.reimbursementId,
    tenantId: claim.tenantId,
    status: "pending" as const,
    decision: null,
    requester,
  };
  hub.publish(
    `tenant:${claim.tenantId}` as `tenant:${string}`,
    "request.updated",
    requestCreatedPayload,
  );
  hub.publish("superadmin", "request.updated", requestCreatedPayload);

  return request;
}

export async function listClaimRequests(
  context: ChatAccessContext,
  claimId: string,
): Promise<ListClaimRequestsResult | null> {
  const claim = await assertClaimAccess(context, claimId);
  if (!claim) {
    return null;
  }

  const repositories = await getRepositoryContext();
  const requests = await repositories.claimRequests.listByClaimId(claimId);
  return { requests };
}

export type ClaimRequestDecision =
  | "approved"
  | "rejected"
  | "more_info"
  | "converted_to_chat";

export async function decideClaimRequest(
  context: ChatAccessContext,
  requestId: string,
  decision: ClaimRequestDecision,
  resolutionNote?: string,
): Promise<ClaimRequestDocument | null> {
  const repositories = await getRepositoryContext();
  const request = await repositories.claimRequests.findById(requestId);
  if (!request) {
    return null;
  }

  // Only the organization (tenant admin of the same tenant) OR the platform-wide
  // Super Admin can decide. assertClaimAccess already gates both roles for the
  // underlying claim (see claimMessageService.assertClaimAccess — superAdmin is
  // granted cross-tenant access). The whitelist below matches that contract.
  const claim = await assertClaimAccess(context, request.claimId);
  if (!claim) {
    return null;
  }
  if (
    context.participant.role !== "tenantAdmin" &&
    context.participant.role !== "superAdmin"
  ) {
    return null;
  }
  if (request.status !== "pending") {
    return null;
  }

  const now = new Date().toISOString();
  const status = decision as ClaimRequestStatus;

  let convertedToChatMessageId: string | undefined;
  if (decision === "converted_to_chat") {
    // Seed a chat thread with the request context so the parties can discuss it.
    const chatMessage = await postChatMessage(
      context,
      request.claimId,
      `[Request] ${request.subject} — ${request.body}`,
    );
    convertedToChatMessageId = chatMessage?.messageId;
  }

  const responder: ClaimRequestParticipant = {
    role: "tenantAdmin",
    id: context.participant.id,
    name: context.participant.name,
    key: context.participant.key,
  };

  const updated = await repositories.claimRequests.update(requestId, {
    status,
    responder,
    resolutionNote: resolutionNote?.trim() || undefined,
    ...(convertedToChatMessageId ? { convertedToChatMessageId } : {}),
  });

  if (updated) {
    await fireSideEffect(() =>
      notify({
        tenantId: claim.tenantId,
        claimId: claim.reimbursementId,
        claimNumber: claim.claimNumber,
        recipientType: "employee",
        recipientId: claim.employeeId,
        type: "claim_request",
        title: `Request ${decisionLabel(decision)}`,
        body: `Your request "${request.subject}" was ${decisionLabel(decision)}`
          + (resolutionNote?.trim() ? `: ${resolutionNote.trim()}` : ""),
        requestId: requestId,
      }),
    );

    // Additive — also notify the platform-wide Super Admin so the bell can
    // deep-link the Super Admin Requests workspace. Existing employee
    // recipient is preserved unchanged.
    await fireSideEffect(() =>
      notify({
        tenantId: "",
        claimId: claim.reimbursementId,
        claimNumber: claim.claimNumber,
        recipientType: "superAdmin",
        recipientId: "super-admin",
        type: "claim_request",
        title: `Request ${decisionLabel(decision)}`,
        body: `Request "${request.subject}" was ${decisionLabel(decision)}`
          + (resolutionNote?.trim() ? `: ${resolutionNote.trim()}` : ""),
        requestId: requestId,
      }),
    );

    // PA8: broadcast request.updated so any open employee/admin UI that lists
    // requests can refresh instantly without polling.
    const hub = getHub();
    const requestUpdatedPayload = {
      requestId,
      claimId: claim.reimbursementId,
      tenantId: claim.tenantId,
      status,
      decision,
      responder,
    };
    hub.publish(
      `tenant:${claim.tenantId}` as `tenant:${string}`,
      "request.updated",
      requestUpdatedPayload,
    );
    hub.publish("superadmin", "request.updated", requestUpdatedPayload);
  }

  return updated;
}

function decisionLabel(decision: ClaimRequestDecision): string {
  switch (decision) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "more_info":
      return "needs more info";
    case "converted_to_chat":
      return "moved to chat";
  }
}

function fireSideEffect<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error) => {
    console.error("[request] side effect failed:", error);
    return undefined as T;
  });
}