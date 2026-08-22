"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { beds, gardens, plantCatalog, plants } from "@/db/schema";
import { requireGardenAccess, requireUser } from "@/lib/guards";
import { gardenIdForBed, gardenIdForPlant } from "@/lib/queries/ownership";
import { addDaysIso, todayInAppZone } from "@/lib/dates";
import { clampRect, isCellFree, type Rect } from "@/lib/plan-geometry";
import { plantPositionSchema, plantSchema, plantStatusSchema } from "@/lib/validation";
import { fail, ok, withAction, type ActionResult } from "@/lib/action-result";

export interface CatalogOption {
  id: string;
  name: string;
  latinName: string | null;
  family: string;
  daysToMaturity: number | null;
  spacingCm: number | null;
  careNotes: string | null;
  /** True for the gardener's own entry rather than the shared seeded catalog. */
  isCustom: boolean;
}

/**
 * Type-ahead for the plant picker. The shared seeded catalog is visible to
 * everyone; entries a gardener added themselves are visible only to them.
 */
export async function searchCatalog(query: string, locale: string): Promise<CatalogOption[]> {
  const user = await requireUser();

  const name = locale === "en" ? plantCatalog.nameEn : plantCatalog.nameLt;
  const careNotes = locale === "en" ? plantCatalog.careNotesEn : plantCatalog.careNotesLt;
  const term = `%${query.trim()}%`;

  const rows = await db
    .select({
      id: plantCatalog.id,
      name,
      latinName: plantCatalog.latinName,
      family: plantCatalog.family,
      daysToMaturity: plantCatalog.daysToMaturity,
      spacingCm: plantCatalog.spacingCm,
      careNotes,
      createdByUserId: plantCatalog.createdByUserId,
    })
    .from(plantCatalog)
    .where(
      and(
        or(isNull(plantCatalog.createdByUserId), eq(plantCatalog.createdByUserId, user.id)),
        query.trim()
          ? or(
              ilike(plantCatalog.nameLt, term),
              ilike(plantCatalog.nameEn, term),
              ilike(plantCatalog.latinName, term),
            )
          : sql`true`,
      ),
    )
    // The gardener's own plants first — they are the ones the seed list missed.
    .orderBy(sql`${plantCatalog.createdByUserId} is null`, name)
    .limit(query.trim() ? 20 : 60);

  return rows.map(({ createdByUserId, ...row }) => ({
    ...row,
    isCustom: createdByUserId !== null,
  }));
}

/** Everything already occupying a cell on the plan: beds and placed plants. */
async function occupiedCells(gardenId: string, exceptPlantId?: string): Promise<Rect[]> {
  const [bedRows, plantRows] = await Promise.all([
    db
      .select({
        gridX: beds.gridX,
        gridY: beds.gridY,
        gridW: beds.gridW,
        gridH: beds.gridH,
      })
      .from(beds)
      .where(eq(beds.gardenId, gardenId)),

    db
      .select({
        id: plants.id,
        gridX: plants.gridX,
        gridY: plants.gridY,
        gridW: plants.gridW,
        gridH: plants.gridH,
      })
      .from(plants)
      .where(
        and(eq(plants.gardenId, gardenId), isNull(plants.bedId), ne(plants.status, "removed")),
      ),
  ]);

  const placed = plantRows
    .filter((row) => row.id !== exceptPlantId && row.gridX !== null && row.gridY !== null)
    .map((row) => ({
      gridX: row.gridX as number,
      gridY: row.gridY as number,
      gridW: row.gridW,
      gridH: row.gridH,
    }));

  return [...bedRows, ...placed];
}

async function gridFor(gardenId: string): Promise<{ cols: number; rows: number } | null> {
  const [garden] = await db
    .select({ cols: gardens.gridCols, rows: gardens.gridRows })
    .from(gardens)
    .where(eq(gardens.id, gardenId))
    .limit(1);
  return garden ?? null;
}

export async function createPlant(input: unknown): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const parsed = plantSchema.safeParse(input);
    if (!parsed.success) {
      return fail("required", z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    await requireGardenAccess(data.gardenId, "editContent");

    // A bed from another garden would otherwise be a cross-garden write.
    if (data.bedId && (await gardenIdForBed(data.bedId)) !== data.gardenId) {
      return fail("notFound");
    }

    // Estimate the harvest date from the catalog when the user did not set one.
    let expectedHarvestDate = data.expectedHarvestDate || null;
    if (!expectedHarvestDate && data.catalogId && data.plantedDate) {
      const [entry] = await db
        .select({ days: plantCatalog.daysToMaturity })
        .from(plantCatalog)
        .where(eq(plantCatalog.id, data.catalogId))
        .limit(1);
      if (entry?.days) expectedHarvestDate = addDaysIso(data.plantedDate, entry.days);
    }

    let placement: Rect | null = null;
    if (!data.bedId) {
      const garden = await gridFor(data.gardenId);
      if (!garden) return fail("notFound");

      placement = clampRect(
        { gridX: data.gridX ?? 0, gridY: data.gridY ?? 0, gridW: data.gridW, gridH: data.gridH },
        garden.cols,
        garden.rows,
      );
      if (!isCellFree(placement, await occupiedCells(data.gardenId))) return fail("cellTaken");
    }

    const [created] = await db
      .insert(plants)
      .values({
        gardenId: data.gardenId,
        bedId: data.bedId || null,
        catalogId: data.catalogId || null,
        freeformName: data.freeformName || null,
        variety: data.variety || null,
        quantity: data.quantity ?? null,
        plantedDate: data.plantedDate || null,
        expectedHarvestDate,
        status: data.status,
        gridX: placement?.gridX ?? null,
        gridY: placement?.gridY ?? null,
        gridW: placement?.gridW ?? 1,
        gridH: placement?.gridH ?? 1,
      })
      .returning({ id: plants.id });

    revalidatePath("/plan");
    revalidatePath("/");
    if (data.bedId) revalidatePath(`/beds/${data.bedId}`);
    return ok({ id: created.id });
  });
}

/** Persists a drag of a free-standing plant on the plan. */
export async function updatePlantPosition(input: unknown): Promise<ActionResult> {
  return withAction(async () => {
    const parsed = plantPositionSchema.safeParse(input);
    if (!parsed.success) return fail("generic");
    const { id, ...rect } = parsed.data;

    const gardenId = await gardenIdForPlant(id);
    if (!gardenId) return fail("notFound");
    await requireGardenAccess(gardenId, "editContent");

    const garden = await gridFor(gardenId);
    if (!garden) return fail("notFound");

    // Clamp server-side: the client is not the authority on the grid bounds.
    const placement = clampRect(rect, garden.cols, garden.rows);
    if (!isCellFree(placement, await occupiedCells(gardenId, id))) return fail("cellTaken");

    await db.update(plants).set(placement).where(eq(plants.id, id));

    revalidatePath("/plan");
    return ok();
  });
}

export async function updatePlantStatus(plantId: string, status: unknown): Promise<ActionResult> {
  return withAction(async () => {
    const parsedStatus = plantStatusSchema.safeParse(status);
    if (!parsedStatus.success) return fail("generic");

    const [plant] = await db
      .select({ bedId: plants.bedId, plantedDate: plants.plantedDate })
      .from(plants)
      .where(eq(plants.id, plantId))
      .limit(1);
    if (!plant) return fail("notFound");

    const gardenId = await gardenIdForPlant(plantId);
    if (!gardenId) return fail("notFound");
    await requireGardenAccess(gardenId, "editContent");

    await db
      .update(plants)
      .set({
        status: parsedStatus.data,
        // Record the planting date the first time it is marked as planted.
        plantedDate:
          parsedStatus.data === "planted" && !plant.plantedDate
            ? todayInAppZone()
            : plant.plantedDate,
      })
      .where(eq(plants.id, plantId));

    revalidatePath("/plan");
    revalidatePath("/");
    if (plant.bedId) revalidatePath(`/beds/${plant.bedId}`);
    return ok();
  });
}

export async function deletePlant(plantId: string): Promise<ActionResult> {
  return withAction(async () => {
    const [plant] = await db
      .select({ bedId: plants.bedId, gardenId: plants.gardenId })
      .from(plants)
      .where(eq(plants.id, plantId))
      .limit(1);
    if (!plant) return fail("notFound");

    await requireGardenAccess(plant.gardenId, "editContent");

    await db.delete(plants).where(eq(plants.id, plantId));

    revalidatePath("/plan");
    revalidatePath("/");
    if (plant.bedId) revalidatePath(`/beds/${plant.bedId}`);
    return ok();
  });
}
