import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  beds,
  plantCatalog,
  plants,
  progressLogs,
  progressPhotos,
  tasks,
  type PlantFamily,
  type TaskType,
} from "@/db/schema";

export interface BedDetail {
  bed: {
    id: string;
    gardenId: string;
    name: string;
    gridW: number;
    gridH: number;
    sunExposure: "full" | "partial" | "shade" | null;
    soilType: string | null;
    notes: string | null;
  };
  plants: {
    id: string;
    name: string;
    variety: string | null;
    quantity: number | null;
    status: "planned" | "planted" | "harvesting" | "removed";
    plantedDate: string | null;
    expectedHarvestDate: string | null;
    family: PlantFamily;
    latinName: string | null;
    spacingCm: number | null;
    daysToMaturity: number | null;
    careNotes: string | null;
  }[];
  tasks: { id: string; title: string; type: TaskType; dueDate: string; status: string }[];
  entries: { id: string; occurredAt: Date; note: string | null; photoUrl: string | null }[];
}

export async function getBedDetail(bedId: string, locale: string): Promise<BedDetail | null> {
  const catalogName = locale === "en" ? plantCatalog.nameEn : plantCatalog.nameLt;
  const careNotes = locale === "en" ? plantCatalog.careNotesEn : plantCatalog.careNotesLt;

  const [bed] = await db.select().from(beds).where(eq(beds.id, bedId)).limit(1);
  if (!bed) return null;

  const [plantRows, taskRows, entryRows] = await Promise.all([
    db
      .select({
        id: plants.id,
        catalogName,
        freeformName: plants.freeformName,
        variety: plants.variety,
        quantity: plants.quantity,
        status: plants.status,
        plantedDate: plants.plantedDate,
        expectedHarvestDate: plants.expectedHarvestDate,
        family: plantCatalog.family,
        latinName: plantCatalog.latinName,
        spacingCm: plantCatalog.spacingCm,
        daysToMaturity: plantCatalog.daysToMaturity,
        careNotes,
      })
      .from(plants)
      .leftJoin(plantCatalog, eq(plantCatalog.id, plants.catalogId))
      .where(eq(plants.bedId, bedId))
      .orderBy(asc(plants.createdAt)),

    db
      .select({
        id: tasks.id,
        title: tasks.title,
        type: tasks.type,
        dueDate: tasks.dueDate,
        status: tasks.status,
      })
      .from(tasks)
      .where(and(eq(tasks.bedId, bedId), eq(tasks.status, "open")))
      .orderBy(asc(tasks.dueDate))
      .limit(20),

    db
      .select({
        id: progressLogs.id,
        occurredAt: progressLogs.occurredAt,
        note: progressLogs.note,
        photoUrl: progressPhotos.url,
      })
      .from(progressLogs)
      .leftJoin(
        progressPhotos,
        and(eq(progressPhotos.logId, progressLogs.id), eq(progressPhotos.isCover, true)),
      )
      .where(eq(progressLogs.bedId, bedId))
      .orderBy(desc(progressLogs.occurredAt))
      .limit(12),
  ]);

  return {
    bed: {
      id: bed.id,
      gardenId: bed.gardenId,
      name: bed.name,
      gridW: bed.gridW,
      gridH: bed.gridH,
      sunExposure: bed.sunExposure,
      soilType: bed.soilType,
      notes: bed.notes,
    },
    plants: plantRows.map((plant) => ({
      id: plant.id,
      name: plant.catalogName ?? plant.freeformName ?? "",
      variety: plant.variety,
      quantity: plant.quantity,
      status: plant.status,
      plantedDate: plant.plantedDate,
      expectedHarvestDate: plant.expectedHarvestDate,
      family: (plant.family ?? "other") as PlantFamily,
      latinName: plant.latinName,
      spacingCm: plant.spacingCm,
      daysToMaturity: plant.daysToMaturity,
      careNotes: plant.careNotes,
    })),
    tasks: taskRows,
    entries: entryRows,
  };
}
