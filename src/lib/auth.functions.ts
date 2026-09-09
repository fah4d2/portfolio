import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  ADMIN_EMAIL,
  createSession,
  destroySession,
  getSessionUser,
  hashPassword,
  requireAdmin,
  toPublicUser,
  verifyPassword,
  type PublicUser,
} from "./auth.server";
import { db, DuplicateKeyError, isDatabaseConfigured, type UserDoc } from "./db.server";

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ user: PublicUser | null; databaseReady: boolean }> => {
    if (!isDatabaseConfigured()) return { user: null, databaseReady: false };
    return { user: await getSessionUser(), databaseReady: true };
  },
);

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(24)
    .regex(/^[a-z0-9_.]+$/, "Use letters, numbers, dots or underscores only"),
  email: emailSchema,
  password: passwordSchema,
});

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signUpSchema.parse(input))
  .handler(async ({ data }): Promise<{ user: PublicUser }> => {
    const existing = await db.findOne<UserDoc>("users", {
      $or: [{ email: data.email }, { username: data.username }],
    });
    if (existing) {
      throw new Error(
        existing.email === data.email
          ? "An account with this email already exists."
          : "That username is taken.",
      );
    }

    const user: UserDoc = {
      _id: crypto.randomUUID(),
      name: data.name,
      username: data.username,
      email: data.email,
      passwordHash: await hashPassword(data.password),
      role: "member",
      createdAt: new Date().toISOString(),
    };

    try {
      await db.insertOne("users", user);
    } catch (error) {
      if (error instanceof DuplicateKeyError) throw new Error("That email or username is taken.");
      throw error;
    }

    await createSession(user._id);
    return { user: toPublicUser(user) };
  });

const signInSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username"),
  password: z.string().min(1, "Enter your password"),
});

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signInSchema.parse(input))
  .handler(async ({ data }): Promise<{ user: PublicUser }> => {
    const identifier = data.identifier.toLowerCase();
    const user = await db.findOne<UserDoc>("users", {
      $or: [{ email: identifier }, { username: identifier }],
    });
    const valid = user ? await verifyPassword(data.password, user.passwordHash) : false;
    if (!user || !valid) throw new Error("Wrong email/username or password.");

    await createSession(user._id);
    return { user: toPublicUser(user) };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  destroySession();
  return { ok: true };
});

/* --------------------------- admin first-run setup --------------------------- */

export const getAdminSetupState = createServerFn({ method: "GET" }).handler(async () => {
  if (!isDatabaseConfigured()) return { databaseReady: false, adminExists: false };
  const admin = await db.findOne<UserDoc>("users", { role: "admin" });
  return { databaseReady: true, adminExists: Boolean(admin), email: ADMIN_EMAIL };
});

const setupSchema = z.object({
  password: passwordSchema,
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_.]+$/),
});

export const createAdminAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => setupSchema.parse(input))
  .handler(async ({ data }): Promise<{ user: PublicUser }> => {
    const existingAdmin = await db.findOne<UserDoc>("users", { role: "admin" });
    if (existingAdmin) throw new Error("The admin account already exists.");

    const admin: UserDoc = {
      _id: crypto.randomUUID(),
      name: "Fahad Alazmi",
      username: data.username,
      email: ADMIN_EMAIL,
      passwordHash: await hashPassword(data.password),
      role: "admin",
      createdAt: new Date().toISOString(),
    };
    await db.insertOne("users", admin);
    await createSession(admin._id);
    return { user: toPublicUser(admin) };
  });

/* ------------------------------ account changes ------------------------------ */

const credentialsSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  email: emailSchema.optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_.]+$/)
    .optional(),
  newPassword: z.union([passwordSchema, z.literal("")]).optional(),
});

export type AdminUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "admin" | "member";
  createdAt: string;
};

export const getAllUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const users = await db.find<UserDoc>("users", {}, { sort: { createdAt: -1 }, limit: 500 });
  return {
    users: users.map(
      (user): AdminUser => ({
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      }),
    ),
  };
});

export const updateAdminCredentials = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => credentialsSchema.parse(input))
  .handler(async ({ data }) => {
    const current = await requireAdmin();
    const user = await db.findOne<UserDoc>("users", { _id: current.id });
    if (!user) throw new Error("Account not found.");
    if (!(await verifyPassword(data.currentPassword, user.passwordHash))) {
      throw new Error("Your current password is incorrect.");
    }

    const update: Record<string, unknown> = {};
    if (data.email && data.email !== user.email) update["email"] = data.email;
    if (data.username && data.username !== user.username) update["username"] = data.username;
    if (data.newPassword) update["passwordHash"] = await hashPassword(data.newPassword);
    if (Object.keys(update).length === 0) return { ok: true, changed: false };

    await db.updateOne("users", { _id: user._id }, { $set: update });
    return { ok: true, changed: true };
  });
