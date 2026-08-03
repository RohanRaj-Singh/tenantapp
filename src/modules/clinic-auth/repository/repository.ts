import type { Db, ObjectId } from "mongodb";
import { getMongoDb } from "@/src/server/db/mongodb";
import { getMemoryStore } from "@/src/server/db/memoryStore";
import { getRepositoryContext } from "@/src/server/repositories/context";
import { COLLECTION_NAMES } from "@/src/server/db/documents";
import type {
  ClinicSession,
  ClinicUser,
  CreateClinicSessionInput,
  CreateClinicUserRecordInput,
  UpdateClinicUserInput,
} from "../contracts/types";
import { createClinicSessionId, createClinicUserId } from "../utils/passwords";
import { normalizeClinicEmail } from "../validators/credentials";

const CLINIC_SESSIONS_COLLECTION = COLLECTION_NAMES.clinicSessions;

interface ClinicSessionRecord extends ClinicSession {
  _id?: ObjectId;
  expiresAt: Date;
}

let mongoIndexesPromise: Promise<void> | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

async function getMongoClinicAuthDb(): Promise<Db | null> {
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
    const sessions = db.collection<ClinicSessionRecord>(CLINIC_SESSIONS_COLLECTION);

    mongoIndexesPromise = Promise.all([
      sessions.createIndexes([
        { key: { sessionToken: 1 }, unique: true, name: "clinic_session_token_unique" },
        { key: { clinicUserId: 1 }, name: "clinic_session_user_id" },
        { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "clinic_session_ttl" },
      ]),
    ]).then(() => undefined);
  }

  await mongoIndexesPromise;
}

function mapClinicSession(
  record: ClinicSessionRecord | null,
): ClinicSession | null {
  if (!record) {
    return null;
  }

  const { _id: _mongoId, expiresAt, ...session } = record;
  return { ...session, expiresAt: new Date(expiresAt).toISOString() };
}

async function withClinicAuthStore<T>(
  handlers: {
    mongo: (db: Db) => Promise<T>;
    memory: () => Promise<T>;
  },
): Promise<T> {
  const db = await getMongoClinicAuthDb();

  if (db) {
    await ensureMongoIndexes(db);
    return handlers.mongo(db);
  }

  return handlers.memory();
}

function buildClinicUserUpdates(updates: UpdateClinicUserInput): UpdateClinicUserInput {
  const normalized: UpdateClinicUserInput = {
    ...updates,
    updatedAt: updates.updatedAt ?? new Date().toISOString(),
  };

  if (updates.email !== undefined) {
    normalized.email = normalizeClinicEmail(updates.email);
  }

  return normalized;
}

// ── Clinic User records (delegated to the shared server repository) ──────────

export async function createClinicUser(
  input: CreateClinicUserRecordInput,
): Promise<ClinicUser> {
  const now = new Date().toISOString();
  const user: ClinicUser = {
    clinicUserId: createClinicUserId(),
    email: normalizeClinicEmail(input.email),
    passwordHash: input.passwordHash,
    name: input.name.trim(),
    clinicIds: [...input.clinicIds],
    tenantIds: [...input.tenantIds],
    status: input.status,
    failedLoginAttempts: 0,
    lockedUntil: null,
    mustChangePassword: input.mustChangePassword,
    lastAccessAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const repositories = await getRepositoryContext();
  await repositories.clinicUsers.insert(user);
  return clone(user);
}

export async function getClinicUserById(
  clinicUserId: string,
): Promise<ClinicUser | null> {
  const repositories = await getRepositoryContext();
  const user = await repositories.clinicUsers.findById(clinicUserId);
  return user ? clone(user) : null;
}

export async function getClinicUserByEmail(
  email: string,
): Promise<ClinicUser | null> {
  const repositories = await getRepositoryContext();
  const user = await repositories.clinicUsers.findByEmail(email);
  return user ? clone(user) : null;
}

export async function updateClinicUser(
  clinicUserId: string,
  updates: UpdateClinicUserInput,
): Promise<ClinicUser | null> {
  const normalizedUpdates = buildClinicUserUpdates(updates);
  const repositories = await getRepositoryContext();
  const user = await repositories.clinicUsers.update(clinicUserId, normalizedUpdates);
  return user ? clone(user) : null;
}

// ── Clinic Session records ───────────────────────────────────────────────────

export async function createClinicSession(
  input: CreateClinicSessionInput,
): Promise<ClinicSession> {
  const now = new Date().toISOString();
  const session: ClinicSession = {
    id: createClinicSessionId(),
    clinicUserId: input.clinicUserId,
    sessionToken: input.sessionToken,
    createdAt: now,
    expiresAt: input.expiresAt,
    lastAccessedAt: now,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  };

  return withClinicAuthStore({
    async mongo(db) {
      const record: ClinicSessionRecord = {
        ...session,
        expiresAt: new Date(session.expiresAt),
      };
      await db
        .collection<ClinicSessionRecord>(CLINIC_SESSIONS_COLLECTION)
        .insertOne(record);
      return session;
    },
    async memory() {
      const store = getMemoryStore();
      store.clinicSessions.set(session.sessionToken, clone(session));
      return session;
    },
  });
}

export async function getClinicSessionByToken(
  sessionToken: string,
): Promise<ClinicSession | null> {
  return withClinicAuthStore({
    async mongo(db) {
      const record = await db
        .collection<ClinicSessionRecord>(CLINIC_SESSIONS_COLLECTION)
        .findOne({ sessionToken });
      return mapClinicSession(record);
    },
    async memory() {
      return clone(getMemoryStore().clinicSessions.get(sessionToken) ?? null);
    },
  });
}

export async function updateClinicSessionLastAccessed(
  sessionToken: string,
  lastAccessedAt: string = new Date().toISOString(),
): Promise<void> {
  await withClinicAuthStore({
    async mongo(db) {
      await db.collection<ClinicSessionRecord>(CLINIC_SESSIONS_COLLECTION).updateOne(
        { sessionToken },
        { $set: { lastAccessedAt } },
      );
    },
    async memory() {
      const store = getMemoryStore();
      const current = store.clinicSessions.get(sessionToken);
      if (!current) {
        return;
      }

      store.clinicSessions.set(sessionToken, {
        ...current,
        lastAccessedAt,
      });
    },
  });
}

export async function deleteClinicSessionByToken(
  sessionToken: string,
): Promise<void> {
  await withClinicAuthStore({
    async mongo(db) {
      await db
        .collection<ClinicSessionRecord>(CLINIC_SESSIONS_COLLECTION)
        .deleteOne({ sessionToken });
    },
    async memory() {
      getMemoryStore().clinicSessions.delete(sessionToken);
    },
  });
}

export async function deleteClinicSessionsByUserId(
  clinicUserId: string,
): Promise<void> {
  await withClinicAuthStore({
    async mongo(db) {
      await db
        .collection<ClinicSessionRecord>(CLINIC_SESSIONS_COLLECTION)
        .deleteMany({ clinicUserId });
    },
    async memory() {
      const store = getMemoryStore();
      for (const [token, session] of store.clinicSessions.entries()) {
        if (session.clinicUserId === clinicUserId) {
          store.clinicSessions.delete(token);
        }
      }
    },
  });
}

export async function deleteExpiredClinicSessions(
  nowIso: string = new Date().toISOString(),
): Promise<number> {
  const now = new Date(nowIso);

  return withClinicAuthStore({
    async mongo(db) {
      const result = await db
        .collection<ClinicSessionRecord>(CLINIC_SESSIONS_COLLECTION)
        .deleteMany({ expiresAt: { $lt: now } });
      return result.deletedCount;
    },
    async memory() {
      const store = getMemoryStore();
      let deleted = 0;

      for (const [token, session] of store.clinicSessions.entries()) {
        const expiresAt =
          session.expiresAt instanceof Date
            ? session.expiresAt.toISOString()
            : session.expiresAt;
        if (expiresAt < nowIso) {
          store.clinicSessions.delete(token);
          deleted += 1;
        }
      }

      return deleted;
    },
  });
}
