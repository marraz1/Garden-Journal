"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { beds, gardenMembers, gardens, plants } from "@/db/schema";
import { requireGardenAccess, requireUser } from "@/lib/guards";
import { ACTIVE_GARDEN_COOKIE } from "@/lib/gardens";
import { clampRect, rectChanged } from "@/lib/plan-geometry";
import { gardenSchema, planSizeSchema } from "@/lib/validation";
import { fail, ok, withAction, type ActionResult } from "@/lib/action-result";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Pulls every bed and free-standing plant back inside the grid after a resize
 * and reports how many had to move. Without this, shrinking a plan leaves
 * objects outside the canvas, where the editor simply clips them.
 *
 * Nothing is ever deleted — `clampRect` shrinks before it repositions, so an
 * object always survives at a minimum of one square metre.
 */
async function fitToGrid(tx: Tx, gardenId: string, cols: number, rows: number): Promise<number> {
  const [bedRows, plantRows] = await Promise.all([
    tx
      .select({
        id: beds.id,
        gridX: beds.gridX,
        gridY: beds.gridY,
        gridW: beds.gridW,
        gridH: beds.gridH,
      })
      .from(beds)
      .where(eq(beds.gardenId, gardenId)),

    tx
      .select({
        id: plants.id,
        gridX: plants.gridX,
        gridY: plants.gridY,
        gridW: plants.gridW,
        gridH: plants.gridH,
      })
      .from(plants)
      .where(and(eq(plants.gardenId, gardenId), isNull(plants.bedId))),
  ]);

  let moved = 0;

  for (const bed of bedRows) {
    const fitted = clampRect(bed, cols, rows);
    if (!rectChanged(bed, fitted)) continue;
    await tx.update(beds).set(fitted).where(eq(beds.id, bed.id));
    moved += 1;
  }

  for (const plant of plantRows) {
    // The check constraint guarantees coordinates on a bed-less plant.
    const current = {
      gridX: plant.gridX ?? 0,
      gridY: plant.gridY ?? 0,
      gridW: plant.gridW,
      gridH: plant.gridH,
    };
    const fitted = clampRect(current, cols, rows);
    if (!rectChanged(current, fitted)) continue;
    await tx.update(plants).set(fitted).where(eq(plants.id, plant.id));
    moved += 1;
  }

  return moved;
}

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
    await db.transaction(async (tx) => {
      await tx
        .update(gardens)
        .set({
          name,
          location: location || null,
          sizeM2: sizeM2 ?? null,
          gridCols,
          gridRows,
        })
        .where(eq(gardens.id, gardenId));

      // The grid may have shrunk, so anything out of bounds must come back in.
      await fitToGrid(tx, gardenId, gridCols, gridRows);
    });

    revalidatePath("/", "layout");
    return ok();
  });
}

/**
 * Resizes just the plan grid, for the control on the plan screen itself.
 * Separate from `updateGarden` because that one requires the garden's name and
 * would clobber the other fields.
 */
export async function updatePlanSize(
  gardenId: string,
  input: unknown,
): Promise<ActionResult<{ moved: number }>> {
  return withAction(async () => {
    await requireGardenAccess(gardenId, "manageGarden");

    const parsed = planSizeSchema.safeParse(input);
    if (!parsed.success) {
      return fail("required", z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
    }
    const { gridCols, gridRows } = parsed.data;

    // One transaction, so the plan can never be resized without its contents
    // being brought back inside it.
    const moved = await db.transaction(async (tx) => {
      await tx.update(gardens).set({ gridCols, gridRows }).where(eq(gardens.id, gardenId));
      return fitToGrid(tx, gardenId, gridCols, gridRows);
    });

    revalidatePath("/plan");
    revalidatePath("/");
    return ok({ moved });
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
