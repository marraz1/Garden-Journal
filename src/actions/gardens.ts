"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { gardenMembers, gardens } from "@/db/schema";
import { requireGardenAccess, requireUser } from "@/lib/guards";
import { ACTIVE_GARDEN_COOKIE } from "@/lib/gardens";
import { gardenSchema } from "@/lib/validation";
import { fail, ok, withAction, type ActionResult } from "@/lib/action-result";

export async function createGarden(input: unknown): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const user = await requireUser();
    const parsed = gardenSchema.safeParse(input);
    if (!parsed.success) {
      return fail("required", z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
    }

    const { name, location, sizeM2, gridCols, gridRows } = parsed.data;

    // Garden and owner membership must land together, or not at all.
    const gardenId = await db.transaction(async (tx) => {
      const [garden] = await tx
        .insert(gardens)
        .values({
          ownerId: user.id,
          name,
          location: location || null,
          sizeM2: sizeM2 ?? null,
          gridCols,
          gridRows,
        })
        .returning({ id: gardens.id });

      await tx.insert(gardenMembers).values({
        gardenId: garden.id,
        userId: user.id,
        role: "owner",
      });

      return garden.id;
    });

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_GARDEN_COOKIE, gardenId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath("/", "layout");
    return ok({ id: gardenId });
  });
}

export async function updateGarden(gardenId: string, input: unknown): Promise<ActionResult> {
  return withAction(async () => {
    await requireGardenAccess(gardenId, "manageGarden");

    const parsed = gardenSchema.safeParse(input);
    if (!parsed.success) {
      return fail("required", z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
    }

    const { name, location, sizeM2, gridCols, gridRows } = parsed.data;
    await db
      .update(gardens)
      .set({
        name,
        location: location || null,
        sizeM2: sizeM2 ?? null,
        gridCols,
        gridRows,
      })
      .where(eq(gardens.id, gardenId));

    revalidatePath("/", "layout");
    return ok();
  });
}

export async function deleteGarden(gardenId: string): Promise<ActionResult> {
  return withAction(async () => {
    await requireGardenAccess(gardenId, "manageGarden");
    await db.delete(gardens).where(eq(gardens.id, gardenId));

    const cookieStore = await cookies();
    if (cookieStore.get(ACTIVE_GARDEN_COOKIE)?.value === gardenId) {
      cookieStore.delete(ACTIVE_GARDEN_COOKIE);
    }

    revalidatePath("/", "layout");
    return ok();
  });
}

/** Removes the caller's own membership. Owners must delete the garden instead. */
export async function leaveGarden(gardenId: string): Promise<ActionResult> {
  return withAction(async () => {
    const { user, role } = await requireGardenAccess(gardenId, "view");
    if (role === "owner") return fail("forbidden");

    await db
      .delete(gardenMembers)
      .where(and(eq(gardenMembers.gardenId, gardenId), eq(gardenMembers.userId, user.id)));

    const cookieStore = await cookies();
    if (cookieStore.get(ACTIVE_GARDEN_COOKIE)?.value === gardenId) {
      cookieStore.delete(ACTIVE_GARDEN_COOKIE);
    }

    revalidatePath("/", "layout");
    return ok();
  });
}

export async function removeMember(gardenId: string, userId: string): Promise<ActionResult> {
  return withAction(async () => {
    await requireGardenAccess(gardenId, "manageMembers");

    // Never remove the owner — that would orphan the garden.
    await db
      .delete(gardenMembers)
      .where(
        and(
          eq(gardenMembers.gardenId, gardenId),
          eq(gardenMembers.userId, userId),
          ne(gardenMembers.role, "owner"),
        ),
      );

    revalidatePath("/settings");
    return ok();
  });
}

export async function changeMemberRole(
  gardenId: string,
  userId: string,
  role: "editor" | "viewer",
): Promise<ActionResult> {
  return withAction(async () => {
    await requireGardenAccess(gardenId, "manageMembers");

    await db
      .update(gardenMembers)
      .set({ role })
      .where(
        and(
          eq(gardenMembers.gardenId, gardenId),
          eq(gardenMembers.userId, userId),
          ne(gardenMembers.role, "owner"),
        ),
      );

    revalidatePath("/settings");
    return ok();
  });
}
