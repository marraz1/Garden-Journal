import "server-only";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { beds, plantCatalog, plants, type PlantFamily } from "@/db/schema";

export interface BedWithPlants {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  colorKey: PlantFamily | null;
  sunExposure: "full" | "partial" | "shade" | null;
  soilType: string | null;
  notes: string | null;
  /** Colour actually rendered: explicit override, else the dominant family. */
  family: PlantFamily;
  plants: { id: string; name: string; status: string; family: PlantFamily }[];
}

export async function listBedsWithPlants(
  gardenId: string,
  locale: string,
): Promise<BedWithPlants[]> {
  const catalogName = locale === "en" ? plantCatalog.nameEn : plantCatalog.nameLt;

  const [bedRows, plantRows] = await Promise.all([
    db
      .select()
      .from(beds)
      .where(eq(beds.gardenId, gardenId))
      .orderBy(asc(beds.gridY), asc(beds.gridX)),

    db
      .select({
        id: plants.id,
        bedId: plants.bedId,
        status: plants.status,
        catalogName,
        freeformName: plants.freeformName,
        family: plantCatalog.family,
      })
      .from(plants)
      .innerJoin(beds, eq(beds.id, plants.bedId))
      .leftJoin(plantCatalog, eq(plantCatalog.id, plants.catalogId))
      .where(and(eq(beds.gardenId, gardenId), ne(plants.status, "removed")))
      .orderBy(asc(plants.createdAt)),
  ]);

  return bedRows.map((bed) => {
    const bedPlants = plantRows
      .filter((plant) => plant.bedId === bed.id)
      .map((plant) => ({
        id: plant.id,
        name: plant.catalogName ?? plant.freeformName ?? "",
        status: plant.status,
        family: (plant.family ?? "other") as PlantFamily,
      }));

    return {
      id: bed.id,
      name: bed.name,
      gridX: bed.gridX,
      gridY: bed.gridY,
      gridW: bed.gridW,
      gridH: bed.gridH,
      colorKey: bed.colorKey,
      sunExposure: bed.sunExposure,
      soilType: bed.soilType,
      notes: bed.notes,
      family: bed.colorKey ?? dominantFamily(bedPlants.map((p) => p.family)),
      plants: bedPlants,
    };
  });
}

/** The most common plant family in a bed, falling back to `other`. */
function dominantFamily(families: PlantFamily[]): PlantFamily {
  if (families.length === 0) return "other";
  const tally = new Map<PlantFamily, number>();
  for (const family of families) tally.set(family, (tally.get(family) ?? 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export async function getBed(bedId: string) {
  const [bed] = await db.select().from(beds).where(eq(beds.id, bedId)).limit(1);
  return bed ?? null;
}
