import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

import { db, type UserDoc } from "./db.server";

const COOKIE_NAME = "fa_session";
const SESSION_DAYS = 30;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function sessionSecret(): string {
  const secret = process.env["SESSION_SECRET"] ?? process.env["MONGO_BRIDGE_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  return secret;
}

/* ---------------------------------- passwords --------------------------------- */

const PBKDF2_ITERATIONS = 150_000;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterationsRaw, saltRaw, hashRaw] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterationsRaw || !saltRaw || !hashRaw) return false;

  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: fromBase64Url(saltRaw),
      iterations: Number(iterationsRaw),
      hash: "SHA-256",
    },
    key,
    256,
  );
  const candidate = toBase64Url(new Uint8Array(bits));
  return timingSafeEqual(candidate, hashRaw);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------------------------------- sessions ---------------------------------- */

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

export async function createSession(userId: string): Promise<void> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${expires}`;
  const token = `${payload}.${await sign(payload)}`;
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function destroySession(): void {
  deleteCookie(COOKIE_NAME, { path: "/" });
}

async function readSessionUserId(): Promise<string | null> {
  const token = getCookie(COOKIE_NAME);
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, signature] = parts as [string, string, string];
  if (!Number.isFinite(Number(expires)) || Number(expires) < Date.now()) return null;
  const expected = await sign(`${userId}.${expires}`);
  if (!timingSafeEqual(signature, expected)) return null;
  return userId;
}

export type PublicUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "admin" | "member";
};

export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

export async function getSessionUser(): Promise<PublicUser | null> {
  const userId = await readSessionUserId();
  if (!userId) return null;
  try {
    const user = await db.findOne<UserDoc>("users", { _id: userId });
    return user ? toPublicUser(user) : null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("You need to sign in to do that.");
  return user;
}

export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Admins only.");
  return user;
}

export const ADMIN_EMAIL = "alazmifahadeid@gmail.com";
