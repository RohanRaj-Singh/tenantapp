import { randomUUID } from "crypto";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { getTenantUserByTenantId } from "@/src/modules/tenant-auth/repository/repository";
import { getHub } from "@/src/server/realtime/hub";
import type {
  NotificationDocument,
  NotificationRecipientType,
  NotificationType,
} from "@/src/server/db/documents";

export interface CreateNotificationInput {
  tenantId: string;
  claimId: string;
  claimNumber?: string;
  recipientType: NotificationRecipientType;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Optional — populated for claim_request notifications so the Admin can deep-link. */
  requestId?: string;
}

/**
 * Create an in-app notification for a specific recipient.
 * This is a best-effort write — callers should treat it as fire-and-forget
 * (wrapped in try/catch) so notification failures never block claim actions.
 */
export async function notify(input: CreateNotificationInput): Promise<void> {
  const now = new Date().toISOString();
  const notification: NotificationDocument = {
    notificationId: `notif_${randomUUID()}`,
    tenantId: input.tenantId,
    claimId: input.claimId,
    claimNumber: input.claimNumber,
    recipientType: input.recipientType,
    recipientId: input.recipientId,
    type: input.type,
    title: input.title,
    body: input.body,
    requestId: input.requestId,
    read: false,
    readAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const repositories = await getRepositoryContext();
  await repositories.notifications.insert(notification);

  // PA8: instant push — broadcast the notification to the tenant topic
  // so the operator's NotificationBell updates immediately.
  // For superAdmin notifications, the topic is `superadmin` (the admin
  // SSE stream subscribes to it). For tenantAdmin/employee/clinic
  // notifications, the topic is `tenant:{tenantId}`.
  const hub = getHub();
  if (input.recipientType === "superAdmin") {
    hub.publish("superadmin", "notification.created", {
      notificationId: notification.notificationId,
      tenantId: input.tenantId,
      claimId: input.claimId,
      recipientType: input.recipientType,
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body,
      requestId: input.requestId,
      read: false,
      createdAt: now,
    });
  } else {
    hub.publish(`tenant:${input.tenantId}` as `tenant:${string}`, "notification.created", {
      notificationId: notification.notificationId,
      tenantId: input.tenantId,
      claimId: input.claimId,
      recipientType: input.recipientType,
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body,
      requestId: input.requestId,
      read: false,
      createdAt: now,
    });
  }
}

/**
 * Notify the tenant admin(s) of a tenant. Today the platform models a single
 * tenant dashboard user per tenant (unique tenantId index), so this resolves
 * that user. Extend to fan-out to multiple admins when multi-admin is enabled.
 */
export async function notifyTenantAdmins(
  input: Omit<CreateNotificationInput, "recipientType" | "recipientId">,
): Promise<void> {
  const tenantAdmin = await getTenantUserByTenantId(input.tenantId);
  if (!tenantAdmin) {
    return;
  }

  await notify({
    ...input,
    recipientType: "tenantAdmin",
    recipientId: tenantAdmin.id,
  });
}

export interface ListNotificationsParams {
  tenantId: string;
  recipientType: NotificationRecipientType;
  recipientId: string;
  unreadOnly?: boolean;
  skip?: number;
  limit?: number;
}

export async function listForRecipient(
  params: ListNotificationsParams,
): Promise<NotificationDocument[]> {
  const repositories = await getRepositoryContext();
  return repositories.notifications.listForRecipient(
    params.tenantId,
    params.recipientType,
    params.recipientId,
    {
      unreadOnly: params.unreadOnly,
      skip: params.skip,
      limit: params.limit,
    },
  );
}

export async function unreadCount(
  tenantId: string,
  recipientType: NotificationRecipientType,
  recipientId: string,
): Promise<number> {
  const repositories = await getRepositoryContext();
  return repositories.notifications.countUnread(tenantId, recipientType, recipientId);
}

export async function markRead(
  notificationId: string,
  tenantId: string,
  recipientType: NotificationRecipientType,
  recipientId: string,
): Promise<NotificationDocument | null> {
  const repositories = await getRepositoryContext();
  return repositories.notifications.markRead(notificationId, tenantId, recipientType, recipientId);
}

export async function markAllRead(
  tenantId: string,
  recipientType: NotificationRecipientType,
  recipientId: string,
): Promise<number> {
  const repositories = await getRepositoryContext();
  return repositories.notifications.markAllRead(tenantId, recipientType, recipientId);
}
