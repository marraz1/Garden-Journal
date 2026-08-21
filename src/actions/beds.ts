"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { beds, gardens } from "@/db/schema";
import { requireGardenAccess } from "@/lib/guards";
import { bedPositionSchema, bedSchema } from "@/lib/validation";
import { fail, ok, withAction, type ActionResult } from "@/lib/action-result";

async function gardenIdForBed(bedId: string): Promise<string | null> {
  const [row] = await db
    .select({ gardenId: beds.gardenId })
    .from(beds)
    .where(eq(beds.id, bedId))
    .limit(1);
  return row?.gardenId ?? null;
}

export async function createBed(
  gardenId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    await requireGardenAccess(gardenId, "editContent");

    const parsed = bedSchema.safeParse(input);
    if (!parsed.success) {
      return fail("required", z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    // Keep the bed inside the garden's grid, whatever the client sent.
    const [garden] = await db
      .select({ cols: gardens.gridCols, rows: gardens.gridRows })
      .from(gardens)
      .where(eq(gardens.id, gardenId))
      .limit(1);
    if (!garden) return fail("notFound");

    const gridW = Math.min(data.gridW, garden.cols);
    const gridH = Math.min(data.gridH, garden.rows);

    const [created] = await db
      .insert(beds)
      .values({
        gardenId,
        name: data.name,
        gridX: Math.min(data.gridX, garden.cols - gridW),
        gridY: Math.min(data.gridY, garden.rows - gridH),
        gridW,
        gridH,
        colorKey: data.colorKey ?? null,
        sunExposure: data.sunExposure ?? null,
        soilType: data.soilType || null,
        notes: data.notes || null,
      })
      .returning({ id: beds.id });

    revalidatePath("/plan");
    revalidatePath("/");
    return ok({ id: created.id });
  });
}

export async function updateBed(bedId: string, input: unknown): Promise<ActionResult> {
  return withAction(async () => {
    const gardenId = await gardenIdForBed(bedId);
    if (!gardenId) return fail("notFound");
    await requireGardenAccess(gardenId, "editContent");

    const parsed = bedSchema.safeParse(input);
    if (!parsed.success) {
      return fail("required", z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    await db
      .update(beds)
      .set({
        name: data.name,
        colorKey: data.colorKey ?? null,
        sunExposure: data.sunExposure ?? null,
        soilType: data.soilType || null,
        notes: data.notes || null,
      })
      .where(eq(beds.id, bedId));

    revalidatePath("/plan");
    revalidatePath(`/beds/${bedId}`);
    return ok();
  });
}

/** Persists a drag or resize from the plan editor. */
export async function updateBedPosition(input: unknown): Promise<ActionResult> {
  return withAction(async () => {
    const parsed = bedPositionSchema.safeParse(input);
    if (!parsed.success) return fail("generic");
    const { id, gridX, gridY, gridW, gridH } = parsed.data;

    const gardenId = await gardenIdForBed(id);
    if (!gardenId) return fail("notFound");
    await requireGardenAccess(gardenId, "editContent");

    const [garden] = await db
      .select({ cols: gardens.gridCols, rows: gardens.gridRows })
      .from(gardens)
      .where(eq(gardens.id, gardenId))
      .limit(1);
    if (!garden) return fail("notFound");

    // Clamp server-side: the client is not the authority on the grid bounds.
    const width = Math.min(gridW, garden.cols);
    const height = Math.min(gridH, garden.rows);

    await db
      .update(beds)
      .set({
        gridX: Math.max(0, Math.min(gridX, garden.cols - width)),
        gridY: Math.max(0, Math.min(gridY, garden.rows - height)),
        gridW: width,
        gridH: height,
      })
      .where(eq(beds.id, id));

    revalidatePath("/plan");
    return ok();
  });
}

export async function deleteBed(bedId: string): Promise<ActionResult> {
  return withAction(async () => {
    const gardenId = await gardenIdForBed(bedId);
    if (!gardenId) return fail("notFound");
    await requireGardenAccess(gardenId, "editContent");

    await db.delete(beds).where(eq(beds.id, bedId));

    revalidatePath("/plan");
    revalidatePath("/");
    return ok();
  });
}
