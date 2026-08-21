"use server";

import { revalidatePath } from "next/cache";
import { addDays, format, parseISO } from "date-fns";
import { eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { beds, plantCatalog, plants } from "@/db/schema";
import { requireGardenAccess, requireUser } from "@/lib/guards";
import { plantSchema } from "@/lib/validation";
import { fail, ok, withAction, type ActionResult } from "@/lib/action-result";

async function gardenIdForBed(bedId: string): Promise<string | null> {
  const [row] = await db
    .select({ gardenId: beds.gardenId })
    .from(beds)
    .where(eq(beds.id, bedId))
    .limit(1);
  return row?.gardenId ?? null;
}

export interface CatalogOption {
  id: string;
  name: string;
  latinName: string | null;
  family: string;
  daysToMaturity: number | null;
  spacingCm: number | null;
  careNotes: string | null;
}

/** Type-ahead for the plant picker. Catalog data is not garden-scoped. */
export async function searchCatalog(query: string, locale: string): Promise<CatalogOption[]> {
  await requireUser();

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
    })
    .from(plantCatalog)
    .where(
      query.trim()
        ? or(
            ilike(plantCatalog.nameLt, term),
            ilike(plantCatalog.nameEn, term),
            ilike(plantCatalog.latinName, term),
          )
        : sql`true`,
    )
    .orderBy(name)
    .limit(query.trim() ? 20 : 60);

  return rows;
}

export async function createPlant(input: unknown): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const parsed = plantSchema.safeParse(input);
    if (!parsed.success) {
      return fail("required", z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    const gardenId = await gardenIdForBed(data.bedId);
    if (!gardenId) return fail("notFound");
    await requireGardenAccess(gardenId, "editContent");

    // Estimate the harvest date from the catalog when the user did not set one.
    let expectedHarvestDate = data.expectedHarvestDate || null;
    if (!expectedHarvestDate && data.catalogId && data.plantedDate) {
      const [entry] = await db
        .select({ days: plantCatalog.daysToMaturity })
        .from(plantCatalog)
        .where(eq(plantCatalog.id, data.catalogId))
        .limit(1);
      if (entry?.days) {
        expectedHarvestDate = format(addDays(parseISO(data.plantedDate), entry.days), "yyyy-MM-dd");
      }
    }

    const [created] = await db
      .insert(plants)
      .values({
        bedId: data.bedId,
        catalogId: data.catalogId || null,
        freeformName: data.freeformName || null,
        variety: data.variety || null,
        quantity: data.quantity ?? null,
        plantedDate: data.plantedDate || null,
        expectedHarvestDate,
        status: data.status,
      })
      .returning({ id: plants.id });

    revalidatePath("/plan");
    revalidatePath("/");
    revalidatePath(`/beds/${data.bedId}`);
    return ok({ id: created.id });
  });
}

export async function updatePlantStatus(
  plantId: string,
  status: "planned" | "planted" | "harvesting" | "removed",
): Promise<ActionResult> {
  return withAction(async () => {
    const [plant] = await db
      .select({ bedId: plants.bedId, plantedDate: plants.plantedDate })
      .from(plants)
      .where(eq(plants.id, plantId))
      .limit(1);
    if (!plant) return fail("notFound");

    const gardenId = await gardenIdForBed(plant.bedId);
    if (!gardenId) return fail("notFound");
    await requireGardenAccess(gardenId, "editContent");

    await db
      .update(plants)
      .set({
        status,
        // Record the planting date the first time it is marked as planted.
        plantedDate:
          status === "planted" && !plant.plantedDate
            ? format(new Date(), "yyyy-MM-dd")
            : plant.plantedDate,
      })
      .where(eq(plants.id, plantId));

    revalidatePath("/plan");
    revalidatePath("/");
    revalidatePath(`/beds/${plant.bedId}`);
    return ok();
  });
}

export async function deletePlant(plantId: string): Promise<ActionResult> {
  return withAction(async () => {
    const [plant] = await db
      .select({ bedId: plants.bedId })
      .from(plants)
      .where(eq(plants.id, plantId))
      .limit(1);
    if (!plant) return fail("notFound");

    const gardenId = await gardenIdForBed(plant.bedId);
    if (!gardenId) return fail("notFound");
    await requireGardenAccess(gardenId, "editContent");

    await db.delete(plants).where(eq(plants.id, plantId));

    revalidatePath("/plan");
    revalidatePath("/");
    revalidatePath(`/beds/${plant.bedId}`);
    return ok();
  });
}
