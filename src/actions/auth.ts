"use server";

import { headers } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { signIn } from "@/lib/auth";
import {
  checkPasswordStrength,
  createResetToken,
  hashPassword,
  hashResetToken,
} from "@/lib/passwords";
import { passwordResetEmail, sendEmail } from "@/lib/email";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";
import { fail, ok, withAction, type ActionResult } from "@/lib/action-result";
import { localizedPath } from "@/i18n/paths";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

async function appBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

export async function signUpWithPassword(input: unknown): Promise<ActionResult> {
  return withAction(async () => {
    const parsed = signUpSchema.safeParse(input);
    if (!parsed.success) return fail("required", fieldErrors(parsed.error));

    const { name, email, password } = parsed.data;

    const strength = checkPasswordStrength(password);
    if (!strength.ok) return fail(strength.error!, { password: [strength.error!] });

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Sign-up is one of the few places where disclosing that an address is
    // taken is unavoidable — the alternative is silently doing nothing.
    if (existing) return fail("emailTaken", { email: ["emailTaken"] });

    await db.insert(users).values({
      name: name || null,
      email,
      passwordHash: await hashPassword(password),
    });

    // signIn throws a redirect on success, which withAction re-throws.
    await signIn("credentials", { email, password, redirect: false });

    return ok();
  });
}

export async function signInWithPassword(input: unknown): Promise<ActionResult> {
  return withAction(async () => {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) return fail("required", fieldErrors(parsed.error));

    try {
      await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
    } catch (error) {
      // Auth.js signals a rejected credential by throwing; anything else is a
      // real failure and should surface as a generic error.
      if (error instanceof Error && error.name === "CredentialsSignin") {
        return fail("invalidCredentials");
      }
      if (error instanceof Error && /NEXT_REDIRECT/.test(error.message)) throw error;
      console.error("[auth] sign-in failed", error);
      return fail("invalidCredentials");
    }

    return ok();
  });
}

/**
 * Always reports success. Telling the caller whether an address is registered
 * would turn this form into an account-enumeration oracle.
 */
export async function requestPasswordReset(input: unknown, locale: string): Promise<ActionResult> {
  return withAction(async () => {
    const parsed = forgotPasswordSchema.safeParse(input);
    if (!parsed.success) return fail("required", fieldErrors(parsed.error));

    const { email } = parsed.data;

    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // No account, or an OAuth-only account with no password to reset.
    if (!user?.passwordHash) return ok();

    const { token, tokenHash } = createResetToken();

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const resetUrl = `${await appBaseUrl()}${localizedPath(locale, `/reset-password/${token}`)}`;
    const { subject, html, text } = passwordResetEmail(resetUrl, locale);
    await sendEmail({ to: email, subject, html, text });

    return ok();
  });
}

export async function resetPassword(input: unknown): Promise<ActionResult> {
  return withAction(async () => {
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) return fail("required", fieldErrors(parsed.error));

    const { token, password } = parsed.data;

    const strength = checkPasswordStrength(password);
    if (!strength.ok) return fail(strength.error!, { password: [strength.error!] });

    const tokenHash = hashResetToken(token);
    const passwordHash = await hashPassword(password);

    const updatedUserId = await db.transaction(async (tx) => {
      const [row] = await tx
        .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!row) return null;

      await tx.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, row.id));

      // Any other outstanding link for this account is now void.
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordResetTokens.userId, row.userId), isNull(passwordResetTokens.usedAt)));

      return row.userId;
    });

    if (!updatedUserId) return fail("resetLinkInvalid");

    return ok();
  });
}
