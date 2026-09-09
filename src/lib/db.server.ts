/**
 * HTTP client for the MongoDB data bridge (see /bridge).
 * Server-only: never import this from client code.
 */

export class BridgeNotConfiguredError extends Error {
  constructor() {
    super(
      "The database is not connected yet. Deploy the data bridge (see the bridge folder) and save MONGO_BRIDGE_URL and MONGO_BRIDGE_SECRET.",
    );
    this.name = "BridgeNotConfiguredError";
  }
}

export class DuplicateKeyError extends Error {
  constructor() {
    super("duplicate");
    this.name = "DuplicateKeyError";
  }
}

export type CollectionName = "users" | "bookings" | "settings";

type BridgePayload = {
  collection: CollectionName;
  op: string;
  filter?: Record<string, unknown>;
  document?: Record<string, unknown>;
  update?: Record<string, unknown>;
  options?: Record<string, unknown>;
};

function bridgeConfig() {
  const url = process.env["MONGO_BRIDGE_URL"];
  const secret = process.env["MONGO_BRIDGE_SECRET"];
  if (!url || !secret) return null;
  return { url: url.replace(/\/+$/, ""), secret };
}

export function isDatabaseConfigured(): boolean {
  return bridgeConfig() !== null;
}

async function call<T>(payload: BridgePayload): Promise<T> {
  const config = bridgeConfig();
  if (!config) throw new BridgeNotConfiguredError();

  const response = await fetch(`${config.url}/query`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-bridge-secret": config.secret,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 409) throw new DuplicateKeyError();
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Database request failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const body = (await response.json()) as { result: T };
  return body.result;
}

export const db = {
  find: <T>(collection: CollectionName, filter: Record<string, unknown> = {}, options?: Record<string, unknown>) =>
    call<T[]>({ collection, op: "find", filter, ...(options ? { options } : {}) }),

  findOne: <T>(collection: CollectionName, filter: Record<string, unknown>, options?: Record<string, unknown>) =>
    call<T | null>({ collection, op: "findOne", filter, ...(options ? { options } : {}) }),

  insertOne: (collection: CollectionName, document: Record<string, unknown>) =>
    call<{ insertedId: string }>({ collection, op: "insertOne", document }),

  updateOne: (
    collection: CollectionName,
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => call<{ matchedCount: number; modifiedCount: number }>({ collection, op: "updateOne", filter, update, ...(options ? { options } : {}) }),

  deleteOne: (collection: CollectionName, filter: Record<string, unknown>) =>
    call<{ deletedCount: number }>({ collection, op: "deleteOne", filter }),

  count: (collection: CollectionName, filter: Record<string, unknown> = {}) =>
    call<number>({ collection, op: "countDocuments", filter }),

  createIndex: (collection: CollectionName, keys: Record<string, 1 | -1>, options?: Record<string, unknown>) =>
    call<string>({ collection, op: "createIndex", document: keys, ...(options ? { options } : {}) }),
};

export type UserDoc = {
  _id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  role: "admin" | "member";
  createdAt: string;
};

export type BookingDoc = {
  _id: string;
  day: string; // yyyy-MM-dd
  start: string; // ISO
  end: string; // ISO
  guestName: string;
  guestEmail: string;
  note: string;
  userId: string | null;
  googleEventId: string | null;
  status: "confirmed" | "cancelled";
  createdAt: string;
};

export type SettingsDoc = {
  _id: string;
  workingDays: number[]; // 0 = Sunday
  startHour: number;
  endHour: number;
  slotMinutes: number;
  bufferMinutes: number;
  timezone: string;
};

export const DEFAULT_SETTINGS: SettingsDoc = {
  _id: "availability",
  workingDays: [0, 1, 2, 3, 4],
  startHour: 10,
  endHour: 18,
  slotMinutes: 30,
  bufferMinutes: 0,
  timezone: "Asia/Kuwait",
};

export async function getSettings(): Promise<SettingsDoc> {
  const stored = await db.findOne<SettingsDoc>("settings", { _id: "availability" });
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}
