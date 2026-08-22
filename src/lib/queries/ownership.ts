import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { beds, plants } from "@/db/schema";

/**
 * Resolving "which garden owns this row" is the first step of every guarded
 * action. It lives here rather than in `src/actions/*` because those files are
 * `"use server"`, where every export must itself be a server action.
 */

export async function gardenIdForBed(bedId: string): Promise<string | null> {
  const [row] = await db
    .select({ gardenId: beds.gardenId })
    .from(beds)
    .where(eq(beds.id, bedId))
    .limit(1);
  return row?.gardenId ?? null;
}

/** Reads the plant's own garden column — a free-standing plant has no bed. */
export async function gardenIdForPlant(plantId: string): Promise<string | null> {
  const [row] = await db
    .select({ gardenId: plants.gardenId })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);
  return row?.gardenId ?? null;
}
