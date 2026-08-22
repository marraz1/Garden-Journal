import "server-only";
import { and, asc, desc, eq, gte, ne } from "drizzle-orm";
import { db } from "@/db";
import { beds, plantCatalog, plants, tasks, type TaskType } from "@/db/schema";
import { addDaysIso, todayInAppZone } from "@/lib/dates";
import type { RecurrenceRule } from "@/lib/recurrence";

export interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  type: TaskType;
  dueDate: string;
  status: "open" | "done" | "skipped";
  recurrence: RecurrenceRule | null;
  bedId: string | null;
  bedName: string | null;
  plantId: string | null;
}

/**
 * Open tasks plus anything completed in the last two weeks, so the list can
 * show recent history without loading a whole season.
 */
export async function listTasks(gardenId: string): Promise<TaskRow[]> {
  const cutoff = addDaysIso(todayInAppZone(), -14);

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      notes: tasks.notes,
      type: tasks.type,
      dueDate: tasks.dueDate,
      status: tasks.status,
      recurrence: tasks.recurrence,
      bedId: tasks.bedId,
      bedName: beds.name,
      plantId: tasks.plantId,
    })
    .from(tasks)
    .leftJoin(beds, eq(beds.id, tasks.bedId))
    .where(and(eq(tasks.gardenId, gardenId), gte(tasks.dueDate, cutoff)))
    .orderBy(asc(tasks.dueDate), desc(tasks.createdAt))
    .limit(500);

  return rows as TaskRow[];
}

export interface TaskTargets {
  beds: { id: string; name: string }[];
  plants: { id: string; bedId: string | null; name: string }[];
}

/** Beds and plants offered as optional links on the task form. */
export async function listTaskTargets(gardenId: string, locale: string): Promise<TaskTargets> {
  const catalogName = locale === "en" ? plantCatalog.nameEn : plantCatalog.nameLt;

  const [bedRows, plantRows] = await Promise.all([
    db
      .select({ id: beds.id, name: beds.name })
      .from(beds)
      .where(eq(beds.gardenId, gardenId))
      .orderBy(asc(beds.name)),

    db
      .select({
        id: plants.id,
        bedId: plants.bedId,
        catalogName,
        freeformName: plants.freeformName,
      })
      .from(plants)
      .leftJoin(plantCatalog, eq(plantCatalog.id, plants.catalogId))
      // Scoped by the plant's garden so free-standing plants stay linkable.
      .where(and(eq(plants.gardenId, gardenId), ne(plants.status, "removed"))),
  ]);

  return {
    beds: bedRows,
    plants: plantRows.map((plant) => ({
      id: plant.id,
      bedId: plant.bedId,
      name: plant.catalogName ?? plant.freeformName ?? "",
    })),
  };
}
