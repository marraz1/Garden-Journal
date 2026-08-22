import { describe, expect, it } from "vitest";
import { plantFamily } from "@/db/schema";
import { catalogPlantSchema, planSizeSchema, plantSchema } from "./validation";

describe("planSizeSchema", () => {
  it("accepts the documented bounds and coerces form strings", () => {
    expect(planSizeSchema.parse({ gridCols: "12", gridRows: "8" })).toEqual({
      gridCols: 12,
      gridRows: 8,
    });
    expect(planSizeSchema.safeParse({ gridCols: 4, gridRows: 4 }).success).toBe(true);
    expect(planSizeSchema.safeParse({ gridCols: 50, gridRows: 50 }).success).toBe(true);
  });

  it("rejects anything outside them", () => {
    expect(planSizeSchema.safeParse({ gridCols: 3, gridRows: 12 }).success).toBe(false);
    expect(planSizeSchema.safeParse({ gridCols: 51, gridRows: 12 }).success).toBe(false);
    expect(planSizeSchema.safeParse({ gridCols: 12.5, gridRows: 12 }).success).toBe(false);
  });
});

describe("plantSchema placement", () => {
  const base = { gardenId: "g1", catalogId: "c1" };

  it("accepts a plant in a bed", () => {
    expect(plantSchema.safeParse({ ...base, bedId: "b1" }).success).toBe(true);
  });

  it("accepts a plant standing on the plan", () => {
    expect(plantSchema.safeParse({ ...base, bedId: null, gridX: 3, gridY: 4 }).success).toBe(true);
  });

  it("rejects a plant that is nowhere", () => {
    const result = plantSchema.safeParse({ ...base, bedId: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("gridX"))).toBe(true);
    }
  });

  it("still rejects a plant with neither a catalog entry nor a name", () => {
    const result = plantSchema.safeParse({ gardenId: "g1", bedId: "b1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("freeformName"))).toBe(true);
    }
  });

  it("defaults a free-standing footprint to one square metre", () => {
    const result = plantSchema.parse({ ...base, bedId: null, gridX: 0, gridY: 0 });
    expect(result.gridW).toBe(1);
    expect(result.gridH).toBe(1);
  });
});

describe("catalogPlantSchema", () => {
  it("requires a name and defaults the family", () => {
    expect(catalogPlantSchema.safeParse({}).success).toBe(false);
    expect(catalogPlantSchema.parse({ name: "Šaltalankis" }).family).toBe("other");
  });

  it("keeps the optional catalog details when given", () => {
    const parsed = catalogPlantSchema.parse({
      name: "Šilauogė",
      family: "berry",
      daysToMaturity: "90",
      spacingCm: "120",
    });
    expect(parsed).toMatchObject({ family: "berry", daysToMaturity: 90, spacingCm: 120 });
  });

  it("rejects a family that is not in the enum", () => {
    expect(catalogPlantSchema.safeParse({ name: "X", family: "fungus" }).success).toBe(false);
  });
});

describe("plantFamilyValues", () => {
  it("is the database enum itself, so the two cannot drift", () => {
    expect(catalogPlantSchema.parse({ name: "X", family: plantFamily.enumValues[0] }).family).toBe(
      plantFamily.enumValues[0],
    );
  });
});
