import "server-only";
import { and, asc, count, desc, eq, gte, isNotNull, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { beds, plantCatalog, plants, progressLogs, progressPhotos, tasks } from "@/db/schema";
import { todayInAppZone, weekBounds } from "@/lib/dates";

export interface DashboardData {
  today: string;
  todayTasks: {
    id: string;
    title: string;
    type: string;
    dueDate: string;
    bedName: string | null;
  }[];
  overdueCount: number;
  weekTaskCount: number;
  upcomingHarvests: { id: string; name: string; date: string; bedName: string | null }[];
  latestPhoto: { url: string; logId: string; note: string | null } | null;
  counts: { beds: number; plants: number };
}

export async function getDashboardData(gardenId: string, locale: string): Promise<DashboardData> {
  const catalogName = locale === "en" ? plantCatalog.nameEn : plantCatalog.nameLt;
  const today = todayInAppZone();
  const { end: weekEnd } = weekBounds(today);

  const [todayTasks, overdue, weekTasks, upcomingHarvests, latestPhoto, bedCount, plantCount] =
    await Promise.all([
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          type: tasks.type,
          dueDate: tasks.dueDate,
          bedName: beds.name,
        })
        .from(tasks)
        .leftJoin(beds, eq(beds.id, tasks.bedId))
        .where(
          and(eq(tasks.gardenId, gardenId), eq(tasks.status, "open"), lte(tasks.dueDate, today)),
        )
        .orderBy(asc(tasks.dueDate))
        .limit(8),

      db
        .select({ value: count() })
        .from(tasks)
        .where(
          and(
            eq(tasks.gardenId, gardenId),
            eq(tasks.status, "open"),
            lte(tasks.dueDate, addOneDayBefore(today)),
          ),
        ),

      db
        .select({ value: count() })
        .from(tasks)
        .where(
          and(
            eq(tasks.gardenId, gardenId),
            eq(tasks.status, "open"),
            gte(tasks.dueDate, today),
            lte(tasks.dueDate, weekEnd),
          ),
        ),

      db
        .select({
          id: plants.id,
          catalogName,
          freeformName: plants.freeformName,
          date: plants.expectedHarvestDate,
          bedName: beds.name,
        })
        .from(plants)
        // Left, not inner: a plant standing on the plan has no bed, and an
        // inner join would drop it from the harvest list entirely.
        .leftJoin(beds, eq(beds.id, plants.bedId))
        .leftJoin(plantCatalog, eq(plantCatalog.id, plants.catalogId))
        .where(
          and(
            eq(plants.gardenId, gardenId),
            ne(plants.status, "removed"),
            isNotNull(plants.expectedHarvestDate),
            gte(plants.expectedHarvestDate, today),
          ),
        )
        .orderBy(asc(plants.expectedHarvestDate))
        .limit(4),

      db
        .select({ url: progressPhotos.url, logId: progressLogs.id, note: progressLogs.note })
        .from(progressPhotos)
        .innerJoin(progressLogs, eq(progressLogs.id, progressPhotos.logId))
        .where(eq(progressLogs.gardenId, gardenId))
        .orderBy(desc(progressLogs.occurredAt), asc(progressPhotos.sortOrder))
        .limit(1),

      db.select({ value: count() }).from(beds).where(eq(beds.gardenId, gardenId)),

      db
        .select({ value: count() })
        .from(plants)
        .where(and(eq(plants.gardenId, gardenId), ne(plants.status, "removed"))),
    ]);

  return {
    today,
    todayTasks,
    overdueCount: overdue[0]?.value ?? 0,
    weekTaskCount: weekTasks[0]?.value ?? 0,
    upcomingHarvests: upcomingHarvests.map((h) => ({
      id: h.id,
      name: h.catalogName ?? h.freeformName ?? "",
      date: h.date!,
      bedName: h.bedName,
    })),
    latestPhoto: latestPhoto[0] ?? null,
    counts: { beds: bedCount[0]?.value ?? 0, plants: plantCount[0]?.value ?? 0 },
  };
}

/** The day before `isoDate` — used to count strictly overdue tasks. */
function addOneDayBefore(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
