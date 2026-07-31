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

  async listForRecipient(
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
    options: ListNotificationsOptions = {},
  ): Promise<NotificationDocument[]> {
    const { unreadOnly = false, skip = 0, limit = 20 } = options;
    const filter: Record<string, unknown> = { tenantId, recipientType, recipientId };
    if (unreadOnly) {
      filter.read = false;
    }

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
    return this.collection().countDocuments({ tenantId, recipientType, recipientId, read: false });
  }

  async markRead(
    notificationId: string,
    tenantId: string,
    recipientType: NotificationRecipientType,
    recipientId: string,
  ): Promise<NotificationDocument | null> {
    const record = await this.collection().findOneAndUpdate(
      { notificationId, tenantId, recipientType, recipientId },
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
      { tenantId, recipientType, recipientId, read: false },
      { $set: { read: true, readAt: new Date().toISOString(), updatedAt: new Date().toISOString() } },
    );
    return result.modifiedCount;
  }
}
