import type { Db, ObjectId } from "mongodb";
import { COLLECTION_NAMES, type NotificationDocument, type NotificationRecipientType } from "@/src/server/db/documents";
import type {
  ListNotificationsOptions,
  NotificationsRepositoryContract,
} from "./contracts";

interface NotificationRecord extends NotificationDocument {
  _id?: ObjectId;
}

export class NotificationsRepository implements NotificationsRepositoryContract {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<NotificationRecord>(COLLECTION_NAMES.notifications);
  }

  async ensureIndexes() {
    await this.collection().createIndexes([
      { key: { notificationId: 1 }, unique: true, name: "notification_id_unique" },
      {
        key: { tenantId: 1, recipientType: 1, recipientId: 1, read: 1 },
        name: "notification_recipient",
      },
      {
        key: { recipientType: 1, recipientId: 1, createdAt: -1 },
        name: "notification_recipient_created",
      },
    ]);
  }

  async insert(notification: NotificationDocument): Promise<void> {
    await this.collection().insertOne(notification as NotificationRecord);
  }

  /**
   * Build the recipient filter. Clinic recipients are not tenant-scoped: a
   * clinic user may serve several organizations, and their notifications carry
   * the claim's tenantId — so `tenantId` is ignored for `clinic`.
   */
  private recipientFilter(
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      ...(recipientType === "clinic" ? {} : { tenantId }),
      recipientType,
      recipientId,
      ...extra,
    };
  }

  async listForRecipient(
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
    options: ListNotificationsOptions = {},
  ): Promise<NotificationDocument[]> {
    const { unreadOnly = false, skip = 0, limit = 20 } = options;
    const filter = this.recipientFilter(tenantId, recipientType, recipientId, unreadOnly ? { read: false } : {});

    return this.collection()
      .find(filter, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray() as Promise<NotificationDocument[]>;
  }

  async countUnread(
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
  ): Promise<number> {
    const filter = this.recipientFilter(tenantId, recipientType, recipientId, { read: false });
    return this.collection().countDocuments(filter);
  }

  async markRead(
    notificationId: string,
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
  ): Promise<NotificationDocument | null> {
    const record = await this.collection().findOneAndUpdate(
      this.recipientFilter(tenantId, recipientType, recipientId, { notificationId }),
      { $set: { read: true, readAt: new Date().toISOString(), updatedAt: new Date().toISOString() } },
      { projection: { _id: 0 }, returnDocument: "after" },
    );
    return record as NotificationDocument | null;
  }

  async markAllRead(
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
  ): Promise<number> {
    const result = await this.collection().updateMany(
      this.recipientFilter(tenantId, recipientType, recipientId, { read: false }),
      { $set: { read: true, readAt: new Date().toISOString(), updatedAt: new Date().toISOString() } },
    );
    return result.modifiedCount;
  }
}
