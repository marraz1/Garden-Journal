"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { plantCatalog, plants } from "@/db/schema";
import { requireUser } from "@/lib/guards";
import { catalogPlantSchema } from "@/lib/validation";
import { fail, ok, withAction, type ActionResult } from "@/lib/action-result";
import type { CatalogOption } from "./plants";

/**
 * Adds a plant the seeded Lithuanian catalog does not cover. The entry belongs
 * to the gardener who created it and never appears in anyone else's picker, so
 * this is guarded by `requireUser` rather than `requireGardenAccess` — a
 * catalog entry is not garden-scoped data.
 */
export async function createCatalogPlant(input: unknown): Promise<ActionResult<CatalogOption>> {
  return withAction(async () => {
    const user = await requireUser();

    const parsed = catalogPlantSchema.safeParse(input);
    if (!parsed.success) {
      return fail("required", z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    // Both name columns are NOT NULL and the picker searches both, so one name
    // field is enough — asking a gardener to translate it buys nothing.
    const [existing] = await db
      .select({ id: plantCatalog.id })
      .from(plantCatalog)
      .where(and(eq(plantCatalog.createdByUserId, user.id), eq(plantCatalog.nameLt, data.name)))
      .limit(1);
    if (existing) return fail("nameTaken");

    const [created] = await db
      .insert(plantCatalog)
      .values({
        nameLt: data.name,
        nameEn: data.name,
        latinName: data.latinName || null,
        family: data.family,
        spacingCm: data.spacingCm ?? null,
        daysToMaturity: data.daysToMaturity ?? null,
        careNotesLt: data.careNotes || null,
        careNotesEn: data.careNotes || null,
        createdByUserId: user.id,
      })
      .returning({
        id: plantCatalog.id,
        name: plantCatalog.nameLt,
        latinName: plantCatalog.latinName,
        family: plantCatalog.family,
        daysToMaturity: plantCatalog.daysToMaturity,
        spacingCm: plantCatalog.spacingCm,
        careNotes: plantCatalog.careNotesLt,
      });

    revalidatePath("/plan");
    // Returned in full so the picker can select it without a second round trip.
    return ok({ ...created, isCustom: true });
  });
}

/**
 * Removes one of the gardener's own entries. The seeded catalog is untouchable.
 * `plants.catalog_id` is ON DELETE SET NULL, so any planting that used the
 * entry would lose its name — copy it across first.
 */
export async function deleteCatalogPlant(entryId: string): Promise<ActionResult> {
  return withAction(async () => {
    const user = await requireUser();

    const [entry] = await db
      .select({ id: plantCatalog.id, name: plantCatalog.nameLt })
      .from(plantCatalog)
      .where(and(eq(plantCatalog.id, entryId), eq(plantCatalog.createdByUserId, user.id)))
      .limit(1);
    if (!entry) return fail("notFound");

    await db.update(plants).set({ freeformName: entry.name }).where(eq(plants.catalogId, entry.id));

    await db.delete(plantCatalog).where(eq(plantCatalog.id, entry.id));

    revalidatePath("/plan");
    return ok();
  });
}
