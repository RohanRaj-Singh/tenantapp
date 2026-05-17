import type { Db, Filter, ObjectId, WithId } from "mongodb";
import { getMongoDb } from "@/src/server/db/mongodb";
import { getMemoryStore } from "@/src/server/db/memoryStore";
import { getRepositoryContext } from "@/src/server/repositories/context";
import type {
  CreateTenantSessionInput,
  CreateTenantUserRecordInput,
  TenantSession,
  TenantUser,
  UpdateTenantUserInput,
} from "../contracts/types";
import { createTenantSessionId, createTenantUserId } from "../utils/passwords";
import {
  normalizeTenantEmail,
  normalizeTenantIdentifier,
  normalizeTenantUsername,
} from "../validators/credentials";
import * as bcrypt from "bcryptjs";

const TENANT_USERS_COLLECTION = "tenantDashboardUsers";
const TENANT_SESSIONS_COLLECTION = "tenantDashboardSessions";

interface TenantUserRecord extends TenantUser {
  _id?: ObjectId;
}

interface TenantSessionRecord extends TenantSession {
  _id?: ObjectId;
  expiresAt: Date;
}

let mongoIndexesPromise: Promise<void> | null = null;
let memorySeedPromise: Promise<void> | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

async function getMongoTenantAuthDb(): Promise<Db | null> {
  if (!process.env.MONGODB_URI) {
    return null;
  }

  try {
    return await getMongoDb();
  } catch (error) {
    if (!isProduction()) {
      return null;
    }

    throw error;
  }
}

async function ensureMongoIndexes(db: Db) {
  if (!mongoIndexesPromise) {
    const users = db.collection<TenantUserRecord>(TENANT_USERS_COLLECTION);
    const sessions = db.collection<TenantSessionRecord>(TENANT_SESSIONS_COLLECTION);

    mongoIndexesPromise = Promise.all([
      users.createIndexes([
        { key: { tenantId: 1 }, unique: true, name: "tenant_dashboard_user_tenant_unique" },
        { key: { email: 1 }, unique: true, name: "tenant_dashboard_user_email_unique" },
        { key: { username: 1 }, unique: true, name: "tenant_dashboard_user_username_unique" },
      ]),
      sessions.createIndexes([
        { key: { sessionToken: 1 }, unique: true, name: "tenant_dashboard_session_token_unique" },
        { key: { tenantUserId: 1 }, name: "tenant_dashboard_session_user_id" },
        { key: { tenantId: 1 }, name: "tenant_dashboard_session_tenant_id" },
        { key:         { expiresAt: 1 }, expireAfterSeconds: 0, name: "tenant_dashboard_session_ttl" },
      ]),
    ]).then(() => undefined);
  }

  await mongoIndexesPromise;
}

function mapTenantUser(record: WithId<TenantUserRecord> | TenantUserRecord | null): TenantUser | null {
  if (!record) {
    return null;
  }

  const { _id: _mongoId, ...user } = record;
  return user;
}

function mapTenantSession(
  record: WithId<TenantSessionRecord> | TenantSessionRecord | null,
): TenantSession | null {
  if (!record) {
    return null;
  }

  const { _id: _mongoId, ...session } = record;
  return session;
}

async function ensureMemorySeeded() {
  if (memorySeedPromise) {
    await memorySeedPromise;
    return;
  }

  memorySeedPromise = (async () => {
    await getRepositoryContext();
    const store = getMemoryStore();

    if (store.tenantDashboardUsers.size > 0) {
      return;
    }

    const nowIso = new Date("2026-05-17T12:00:00.000Z").toISOString();
    const seedUsers = [
      {
        id: "tenant-user-demo-owner",
        tenantId: "tenant-demo",
        email: "owner@demo.remedygcc.local",
        username: "demo.owner",
        password: "DemoOwner1234",
      },
      {
        id: "tenant-user-tenant-b-owner",
        tenantId: "tenant-remedygcc-b",
        email: "owner@tenant-b.remedygcc.local",
        username: "tenantb.owner",
        password: "TenantBOwner1234",
      },
    ] as const;

    for (const seedUser of seedUsers) {
      const passwordHash = await bcrypt.hash(seedUser.password, 12);
      store.tenantDashboardUsers.set(seedUser.id, {
        id: seedUser.id,
        tenantId: seedUser.tenantId,
        email: seedUser.email,
        username: seedUser.username,
        passwordHash,
        status: "active",
        createdAt: nowIso,
        updatedAt: nowIso,
        lastLoginAt: null,
        mustChangePassword: false,
      });
    }
  })().catch((error) => {
    memorySeedPromise = null;
    throw error;
  });

  await memorySeedPromise;
}

async function withTenantAuthStore<T>(
  handlers: {
    mongo: (db: Db) => Promise<T>;
    memory: () => Promise<T>;
  },
): Promise<T> {
  const db = await getMongoTenantAuthDb();

  if (db) {
    await ensureMongoIndexes(db);
    return handlers.mongo(db);
  }

  await ensureMemorySeeded();
  return handlers.memory();
}

function buildTenantUserUpdates(updates: UpdateTenantUserInput): UpdateTenantUserInput {
  return {
    ...updates,
    email: updates.email !== undefined ? normalizeTenantEmail(updates.email) : undefined,
    username:
      updates.username !== undefined ? normalizeTenantUsername(updates.username) : undefined,
    updatedAt: updates.updatedAt ?? new Date().toISOString(),
  };
}

function buildMongoUserFilter(userId: string): Filter<TenantUserRecord> {
  return { id: userId };
}

export async function createTenantUser(
  input: CreateTenantUserRecordInput,
): Promise<TenantUser> {
  const now = new Date().toISOString();
  const user: TenantUser = {
    id: createTenantUserId(),
    tenantId: input.tenantId,
    email: normalizeTenantEmail(input.email),
    username: normalizeTenantUsername(input.username),
    passwordHash: input.passwordHash,
    status: input.status,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    mustChangePassword: input.mustChangePassword,
  };

  return withTenantAuthStore({
    async mongo(db) {
      await db.collection<TenantUserRecord>(TENANT_USERS_COLLECTION).insertOne(user);
      return user;
    },
    async memory() {
      const store = getMemoryStore();
      store.tenantDashboardUsers.set(user.id, clone(user));
      return user;
    },
  });
}

export async function getTenantUserById(userId: string): Promise<TenantUser | null> {
  return withTenantAuthStore({
    async mongo(db) {
      const record = await db
        .collection<TenantUserRecord>(TENANT_USERS_COLLECTION)
        .findOne(buildMongoUserFilter(userId), { projection: { _id: 0 } });
      return mapTenantUser(record);
    },
    async memory() {
      return clone(getMemoryStore().tenantDashboardUsers.get(userId) ?? null);
    },
  });
}

export async function getTenantUserByTenantId(
  tenantId: string,
): Promise<TenantUser | null> {
  return withTenantAuthStore({
    async mongo(db) {
      const record = await db
        .collection<TenantUserRecord>(TENANT_USERS_COLLECTION)
        .findOne({ tenantId }, { projection: { _id: 0 } });
      return mapTenantUser(record);
    },
    async memory() {
      const user =
        Array.from(getMemoryStore().tenantDashboardUsers.values()).find(
          (entry) => entry.tenantId === tenantId,
        ) ?? null;
      return clone(user);
    },
  });
}

export async function getTenantUserByEmail(email: string): Promise<TenantUser | null> {
  const normalizedEmail = normalizeTenantEmail(email);
  return withTenantAuthStore({
    async mongo(db) {
      const record = await db
        .collection<TenantUserRecord>(TENANT_USERS_COLLECTION)
        .findOne({ email: normalizedEmail }, { projection: { _id: 0 } });
      return mapTenantUser(record);
    },
    async memory() {
      const user =
        Array.from(getMemoryStore().tenantDashboardUsers.values()).find(
          (entry) => entry.email === normalizedEmail,
        ) ?? null;
      return clone(user);
    },
  });
}

export async function getTenantUserByUsername(
  username: string,
): Promise<TenantUser | null> {
  const normalizedUsername = normalizeTenantUsername(username);
  return withTenantAuthStore({
    async mongo(db) {
      const record = await db
        .collection<TenantUserRecord>(TENANT_USERS_COLLECTION)
        .findOne({ username: normalizedUsername }, { projection: { _id: 0 } });
      return mapTenantUser(record);
    },
    async memory() {
      const user =
        Array.from(getMemoryStore().tenantDashboardUsers.values()).find(
          (entry) => entry.username === normalizedUsername,
        ) ?? null;
      return clone(user);
    },
  });
}

export async function findTenantUserByIdentifier(
  identifier: string,
): Promise<TenantUser | null> {
  const normalizedIdentifier = normalizeTenantIdentifier(identifier);
  return withTenantAuthStore({
    async mongo(db) {
      const record = await db
        .collection<TenantUserRecord>(TENANT_USERS_COLLECTION)
        .findOne(
          {
            $or: [
              { email: normalizedIdentifier },
              { username: normalizedIdentifier },
            ],
          },
          { projection: { _id: 0 } },
        );
      return mapTenantUser(record);
    },
    async memory() {
      const user =
        Array.from(getMemoryStore().tenantDashboardUsers.values()).find(
          (entry) =>
            entry.email === normalizedIdentifier ||
            entry.username === normalizedIdentifier,
        ) ?? null;
      return clone(user);
    },
  });
}

export async function updateTenantUser(
  userId: string,
  updates: UpdateTenantUserInput,
): Promise<TenantUser | null> {
  const normalizedUpdates = buildTenantUserUpdates(updates);

  return withTenantAuthStore({
    async mongo(db) {
      const collection = db.collection<TenantUserRecord>(TENANT_USERS_COLLECTION);
      const record = await collection.findOneAndUpdate(
        buildMongoUserFilter(userId),
        {
          $set: Object.fromEntries(
            Object.entries(normalizedUpdates).filter(([, value]) => value !== undefined),
          ),
        },
        {
          projection: { _id: 0 },
          returnDocument: "after",
        },
      );

      return mapTenantUser(record);
    },
    async memory() {
      const store = getMemoryStore();
      const current = store.tenantDashboardUsers.get(userId);
      if (!current) {
        return null;
      }

      const next = {
        ...current,
        ...clone(normalizedUpdates),
      };
      store.tenantDashboardUsers.set(userId, next);
      return clone(next);
    },
  });
}

export async function createTenantSession(
  input: CreateTenantSessionInput,
): Promise<TenantSession> {
  const now = new Date().toISOString();
  const session: TenantSession = {
    id: createTenantSessionId(),
    tenantUserId: input.tenantUserId,
    tenantId: input.tenantId,
    sessionToken: input.sessionToken,
    createdAt: now,
    expiresAt: input.expiresAt,
    lastAccessedAt: now,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  };

  const sessionRecord: TenantSessionRecord = {
    ...session,
    expiresAt: new Date(session.expiresAt),
  };

  return withTenantAuthStore({
    async mongo(db) {
      await db
        .collection<TenantSessionRecord>(TENANT_SESSIONS_COLLECTION)
        .insertOne(sessionRecord);
      return session;
    },
    async memory() {
      const store = getMemoryStore();
      store.tenantDashboardSessions.set(session.sessionToken, clone(session));
      return session;
    },
  });
}

export async function getTenantSessionByToken(
  sessionToken: string,
): Promise<TenantSession | null> {
  return withTenantAuthStore({
    async mongo(db) {
      const record = await db
        .collection<TenantSessionRecord>(TENANT_SESSIONS_COLLECTION)
        .findOne({ sessionToken }, { projection: { _id: 0 } });
      return mapTenantSession(record as TenantSessionRecord | null);
    },
    async memory() {
      return clone(getMemoryStore().tenantDashboardSessions.get(sessionToken) ?? null);
    },
  });
}

export async function updateTenantSessionLastAccessed(
  sessionToken: string,
  lastAccessedAt: string = new Date().toISOString(),
): Promise<void> {
  await withTenantAuthStore({
    async mongo(db) {
      await db.collection<TenantSessionRecord>(TENANT_SESSIONS_COLLECTION).updateOne(
        { sessionToken },
        { $set: { lastAccessedAt } },
      );
    },
    async memory() {
      const store = getMemoryStore();
      const current = store.tenantDashboardSessions.get(sessionToken);
      if (!current) {
        return;
      }

      store.tenantDashboardSessions.set(sessionToken, {
        ...current,
        lastAccessedAt,
      });
    },
  });
}

export async function deleteTenantSessionByToken(
  sessionToken: string,
): Promise<void> {
  await withTenantAuthStore({
    async mongo(db) {
      await db
        .collection<TenantSessionRecord>(TENANT_SESSIONS_COLLECTION)
        .deleteOne({ sessionToken });
    },
    async memory() {
      getMemoryStore().tenantDashboardSessions.delete(sessionToken);
    },
  });
}

export async function deleteTenantSessionsByUserId(
  tenantUserId: string,
): Promise<void> {
  await withTenantAuthStore({
    async mongo(db) {
      await db
        .collection<TenantSessionRecord>(TENANT_SESSIONS_COLLECTION)
        .deleteMany({ tenantUserId });
    },
    async memory() {
      const store = getMemoryStore();
      for (const [token, session] of store.tenantDashboardSessions.entries()) {
        if (session.tenantUserId === tenantUserId) {
          store.tenantDashboardSessions.delete(token);
        }
      }
    },
  });
}

export async function deleteTenantSessionsByTenantId(
  tenantId: string,
): Promise<void> {
  await withTenantAuthStore({
    async mongo(db) {
      await db
        .collection<TenantSessionRecord>(TENANT_SESSIONS_COLLECTION)
        .deleteMany({ tenantId });
    },
    async memory() {
      const store = getMemoryStore();
      for (const [token, session] of store.tenantDashboardSessions.entries()) {
        if (session.tenantId === tenantId) {
          store.tenantDashboardSessions.delete(token);
        }
      }
    },
  });
}

export async function deleteExpiredTenantSessions(
  nowIso: string = new Date().toISOString(),
): Promise<number> {
  const now = new Date(nowIso);

  return withTenantAuthStore({
    async mongo(db) {
      const result = await db
        .collection<TenantSessionRecord>(TENANT_SESSIONS_COLLECTION)
        .deleteMany({ expiresAt: { $lt: now } });
      return result.deletedCount;
    },
    async memory() {
      const store = getMemoryStore();
      let deleted = 0;

      for (const [token, session] of store.tenantDashboardSessions.entries()) {
        if (session.expiresAt < nowIso) {
          store.tenantDashboardSessions.delete(token);
          deleted += 1;
        }
      }

      return deleted;
    },
  });
}
