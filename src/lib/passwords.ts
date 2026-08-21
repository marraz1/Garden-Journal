import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

/** Cost 12: ~250ms on Vercel's runtime — slow enough to matter, fast enough to sign in. */
const BCRYPT_ROUNDS = 12;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Burns roughly the same time as a real bcrypt comparison. Called when no user
 * (or no password) matches, so response timing does not reveal which addresses
 * are registered.
 */
export async function fakeVerifyPassword(): Promise<void> {
  await bcrypt.compare(
    "not-a-real-password",
    "$2a$12$C6UzMDM.H6dfI/f/IKcEe.uCkC3ADZ0jJgUYbGr06ZgAE0RILzHZ2",
  );
}

/** A reset token: the raw value goes in the email, only its hash is stored. */
export function createResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison for token hashes. */
export function tokenHashesMatch(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export interface PasswordStrength {
  ok: boolean;
  /** Message key under `errors.*` when not ok. */
  error?: "passwordTooShort" | "passwordTooLong" | "passwordTooWeak";
}

/**
 * Deliberately light: length carries most of the real strength, and long
 * arbitrary composition rules push people toward worse passwords. Only the
 * obviously weak "one repeated character" case is rejected outright.
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  if (password.length < PASSWORD_MIN_LENGTH) return { ok: false, error: "passwordTooShort" };
  if (password.length > PASSWORD_MAX_LENGTH) return { ok: false, error: "passwordTooLong" };
  if (new Set(password).size < 4) return { ok: false, error: "passwordTooWeak" };
  return { ok: true };
}
