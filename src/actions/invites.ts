"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { gardenInvites, gardenMembers } from "@/db/schema";
import { requireGardenAccess, requireUser } from "@/lib/guards";
import { ACTIVE_GARDEN_COOKIE } from "@/lib/gardens";
import { inviteSchema } from "@/lib/validation";
import { fail, ok, withAction, type ActionResult } from "@/lib/action-result";

export async function createInvite(input: unknown): Promise<ActionResult<{ token: string }>> {
  return withAction(async () => {
    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) {
      return fail("required", z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
    }
    const { gardenId, role, days, maxUses } = parsed.data;

    const { user } = await requireGardenAccess(gardenId, "manageMembers");

    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await db.insert(gardenInvites).values({
      gardenId,
      token,
      role,
      createdBy: user.id,
      expiresAt,
      maxUses,
    });

    revalidatePath("/settings");
    return ok({ token });
  });
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  return withAction(async () => {
    const [invite] = await db
      .select({ gardenId: gardenInvites.gardenId })
      .from(gardenInvites)
      .where(eq(gardenInvites.id, inviteId))
      .limit(1);
    if (!invite) return fail("notFound");

    await requireGardenAccess(invite.gardenId, "manageMembers");

    await db
      .update(gardenInvites)
      .set({ revokedAt: new Date() })
      .where(eq(gardenInvites.id, inviteId));

    revalidatePath("/settings");
    return ok();
  });
}

/**
 * Joins the signed-in user to the garden behind an invite token. Validity is
 * re-checked inside the transaction so two people cannot race past `maxUses`.
 */
export async function redeemInvite(
  token: string,
): Promise<ActionResult<{ gardenId: string; alreadyMember: boolean }>> {
  return withAction(async () => {
    const user = await requireUser();

    type RedeemResult =
      | { error: "inviteInvalid" | "inviteExpired" | "inviteUsedUp" }
      | { gardenId: string; alreadyMember: boolean };

    const result = await db.transaction(async (tx): Promise<RedeemResult> => {
      const [invite] = await tx
        .select()
        .from(gardenInvites)
        .where(eq(gardenInvites.token, token))
        .limit(1);

      if (!invite) return { error: "inviteInvalid" as const };
      if (invite.revokedAt) return { error: "inviteInvalid" as const };
      if (invite.expiresAt.getTime() < Date.now()) return { error: "inviteExpired" as const };
      if (invite.useCount >= invite.maxUses) return { error: "inviteUsedUp" as const };

      const [existing] = await tx
        .select({ userId: gardenMembers.userId })
        .from(gardenMembers)
        .where(and(eq(gardenMembers.gardenId, invite.gardenId), eq(gardenMembers.userId, user.id)))
        .limit(1);

      if (existing) return { gardenId: invite.gardenId, alreadyMember: true };

      await tx.insert(gardenMembers).values({
        gardenId: invite.gardenId,
        userId: user.id,
        role: invite.role,
      });

      await tx
        .update(gardenInvites)
        .set({ useCount: sql`${gardenInvites.useCount} + 1` })
        .where(eq(gardenInvites.id, invite.id));

      return { gardenId: invite.gardenId, alreadyMember: false };
    });

    if ("error" in result) return fail(result.error);

    // Drop the joiner straight into the garden they were invited to.
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_GARDEN_COOKIE, result.gardenId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath("/", "layout");
    return ok(result);
  });
}
