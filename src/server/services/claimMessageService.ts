import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { getTenantUserById } from "@/src/modules/tenant-auth/repository/repository";
import { notify, notifyTenantAdmins } from "@/src/server/services/notificationService";
import type {
  ClaimMessageDocument,
  ClaimMessageParticipant,
  ClaimMessageType,
  ReimbursementDocument,
} from "@/src/server/db/documents";

export interface ChatAccessContext {
  tenantId: string;
  participant: ClaimMessageParticipant;
}

/**
 * Resolves access to a claim for a participant. Returns the claim when the caller
 * is allowed, or null when the claim is not found / not accessible.
 *   - superAdmin → cross-tenant oversight (any claim)
 *   - tenantAdmin → same tenant
 *   - employee    → same tenant AND owns the claim
 * Reused by chat and request services.
 */
export async function assertClaimAccess(
  context: ChatAccessContext,
  claimId: string,
): Promise<ReimbursementDocument | null> {
  const repositories = await getRepositoryContext();
  const claim = await repositories.reimbursements.findById(claimId);
  if (!claim) {
    return null;
  }

  const { role } = context.participant;
  if (role === "superAdmin") {
    return claim;
  }
  if (claim.tenantId !== context.tenantId) {
    return null;
  }
  if (role === "employee" && claim.employeeId !== context.participant.id) {
    return null;
  }
  return claim;
}

export async function postChatMessage(
  context: ChatAccessContext,
  claimId: string,
  body: string,
): Promise<ClaimMessageDocument | null> {
  const claim = await assertClaimAccess(context, claimId);
  if (!claim) {
    return null;
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return null;
  }

  const now = new Date().toISOString();
  const message: ClaimMessageDocument = {
    messageId: `msg_${randomUUID()}`,
    tenantId: claim.tenantId,
    claimId,
    type: "text",
    participant: context.participant,
    body: trimmed,
    readBy: [],
    createdAt: now,
    updatedAt: now,
  };

  const repositories = await getRepositoryContext();
  await repositories.claimMessages.insert(message);

  // Notify the other party so new chat messages surface in their bell (best-effort)
  await fireMessageNotification(claim, context.participant, trimmed);

  return message;
}

/**
 * Notifies the recipient of a new chat message: employee posts → tenant admin;
 * tenant admin posts → employee. Best-effort — never blocks the message write.
 */
async function fireMessageNotification(
  claim: ReimbursementDocument,
  participant: ClaimMessageParticipant,
  body: string,
) {
  const reference = claim.claimNumber ?? claim.reimbursementId;
  const senderName = participant.name;

  try {
    if (participant.role === "employee") {
      await notifyTenantAdmins({
        tenantId: claim.tenantId,
        claimId: claim.reimbursementId,
        claimNumber: claim.claimNumber,
        type: "claim_message",
        title: "New message",
        body: `${senderName} sent a message on ${reference}: ${body}`,
      });
    } else if (participant.role === "tenantAdmin") {
      await notify({
        tenantId: claim.tenantId,
        claimId: claim.reimbursementId,
        claimNumber: claim.claimNumber,
        recipientType: "employee",
        recipientId: claim.employeeId,
        type: "claim_message",
        title: "New message",
        body: `${senderName} sent a message on ${reference}: ${body}`,
      });
    }
  } catch (error) {
    console.error("[chat] failed to create message notification:", error);
  }
}

export interface ListChatMessagesResult {
  messages: ClaimMessageDocument[];
  unreadCount: number;
}

export async function listChatMessages(
  context: ChatAccessContext,
  claimId: string,
): Promise<ListChatMessagesResult | null> {
  const claim = await assertClaimAccess(context, claimId);
  if (!claim) {
    return null;
  }

  const repositories = await getRepositoryContext();
  const [messages, unreadCount] = await Promise.all([
    repositories.claimMessages.listByClaimId(claimId),
    repositories.claimMessages.unreadCount(claimId, context.participant.key),
  ]);
  return { messages, unreadCount };
}

export async function markThreadRead(
  context: ChatAccessContext,
  claimId: string,
): Promise<number | null> {
  const claim = await assertClaimAccess(context, claimId);
  if (!claim) {
    return null;
  }

  const repositories = await getRepositoryContext();
  return repositories.claimMessages.markThreadRead(claimId, context.participant.key);
}

/**
 * Bridges a tenant-admin progress update into the claim chat as an `official_update`
 * message. Called from `reimbursementService.postProgressUpdate` (best-effort).
 */
export async function postOfficialUpdate(input: {
  tenantId: string;
  claimId: string;
  actorId: string;
  message: string;
}): Promise<void> {
  const repositories = await getRepositoryContext();
  const tenantAdmin = await getTenantUserById(input.actorId);

  const participant: ClaimMessageParticipant = {
    role: "tenantAdmin",
    id: input.actorId,
    name: tenantAdmin?.username ?? "Reviewer",
    key: `tenantAdmin:${input.actorId}`,
  };

  const now = new Date().toISOString();
  const message: ClaimMessageDocument = {
    messageId: `msg_${randomUUID()}`,
    tenantId: input.tenantId,
    claimId: input.claimId,
    type: "official_update",
    participant,
    body: input.message.trim(),
    readBy: [],
    createdAt: now,
    updatedAt: now,
  };

  await repositories.claimMessages.insert(message);
}
