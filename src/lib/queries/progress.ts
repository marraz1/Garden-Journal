import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { beds, plantCatalog, plants, progressLogs, progressPhotos, users } from "@/db/schema";

export interface ProgressEntry {
  id: string;
  occurredAt: Date;
  note: string | null;
  metrics: Record<string, number | string> | null;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  bedName: string | null;
  plantName: string | null;
  photos: { id: string; url: string; width: number | null; height: number | null }[];
}

export async function listProgress(
  gardenId: string,
  locale: string,
  limit = 50,
): Promise<ProgressEntry[]> {
  const catalogName = locale === "en" ? plantCatalog.nameEn : plantCatalog.nameLt;

  const logRows = await db
    .select({
      id: progressLogs.id,
      occurredAt: progressLogs.occurredAt,
      note: progressLogs.note,
      metrics: progressLogs.metrics,
      authorId: users.id,
      authorName: users.name,
      authorImage: users.image,
      bedName: beds.name,
      catalogName,
      freeformName: plants.freeformName,
    })
    .from(progressLogs)
    .innerJoin(users, eq(users.id, progressLogs.authorId))
    .leftJoin(beds, eq(beds.id, progressLogs.bedId))
    .leftJoin(plants, eq(plants.id, progressLogs.plantId))
    .leftJoin(plantCatalog, eq(plantCatalog.id, plants.catalogId))
    .where(eq(progressLogs.gardenId, gardenId))
    .orderBy(desc(progressLogs.occurredAt))
    .limit(limit);

  if (logRows.length === 0) return [];

  const photoRows = await db
    .select({
      id: progressPhotos.id,
      logId: progressPhotos.logId,
      url: progressPhotos.url,
      width: progressPhotos.width,
      height: progressPhotos.height,
    })
    .from(progressPhotos)
    .innerJoin(progressLogs, eq(progressLogs.id, progressPhotos.logId))
    .where(eq(progressLogs.gardenId, gardenId))
    .orderBy(asc(progressPhotos.sortOrder));

  return logRows.map((log) => ({
    id: log.id,
    occurredAt: log.occurredAt,
    note: log.note,
    metrics: log.metrics,
    authorId: log.authorId,
    authorName: log.authorName,
    authorImage: log.authorImage,
    bedName: log.bedName,
    plantName: log.catalogName ?? log.freeformName ?? null,
    photos: photoRows
      .filter((photo) => photo.logId === log.id)
      .map(({ id, url, width, height }) => ({ id, url, width, height })),
  }));
}
