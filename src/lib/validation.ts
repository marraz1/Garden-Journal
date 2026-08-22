import { z } from "zod";
import { plantFamily } from "@/db/schema";
import { MAX_GRID, MIN_GRID } from "@/lib/plan-geometry";

/** Shared between the client forms (React Hook Form) and the server actions. */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate");
const trimmed = (max: number) => z.string().trim().min(1, "required").max(max, "tooLong");

/* Plan geometry ---------------------------------------------------------- */

/** A plan side, in cells — and therefore in metres, one cell being 1 m². */
const gridSide = z.coerce.number().int().min(MIN_GRID).max(MAX_GRID);
/** A zero-based cell offset. */
const gridCoord = z.coerce
  .number()
  .int()
  .min(0)
  .max(MAX_GRID - 1);
/** A span in cells. The real bound is the garden's own grid; actions clamp. */
const gridSpan = z.coerce.number().int().min(1).max(MAX_GRID);

/* Authentication -------------------------------------------------------- */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "required")
  .max(254, "tooLong")
  .pipe(z.email("invalidEmail"));

// Strength is checked separately by checkPasswordStrength so the reason can be
// reported precisely; here we only bound the length.
const password = z.string().min(1, "required").max(200, "passwordTooLong");

export const signUpSchema = z.object({
  name: z.string().trim().max(80, "tooLong").optional().or(z.literal("")),
  email,
  password,
});

export const signInSchema = z.object({ email, password });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "required").max(200),
  password,
});

/* Gardens --------------------------------------------------------------- */

export const gardenSchema = z.object({
  name: trimmed(80),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  sizeM2: z.coerce.number().int().min(1).max(1_000_000).optional(),
  gridCols: gridSide.default(12),
  gridRows: gridSide.default(12),
});
export type GardenInput = z.infer<typeof gardenSchema>;

/** Just the plan dimensions, for resizing from the plan screen itself. */
export const planSizeSchema = z.object({
  gridCols: gridSide,
  gridRows: gridSide,
});
export type PlanSizeInput = z.infer<typeof planSizeSchema>;

/** Taken from the pgEnum so the two can never drift apart. */
export const plantFamilyValues = plantFamily.enumValues;

export const bedSchema = z.object({
  name: trimmed(60),
  gridX: gridCoord.default(0),
  gridY: gridCoord.default(0),
  gridW: gridSpan.default(2),
  gridH: gridSpan.default(1),
  colorKey: z.enum(plantFamilyValues).nullable().optional(),
  sunExposure: z.enum(["full", "partial", "shade"]).nullable().optional(),
  soilType: z.string().trim().max(60).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type BedInput = z.infer<typeof bedSchema>;

export const bedPositionSchema = z.object({
  id: z.string().min(1),
  gridX: gridCoord,
  gridY: gridCoord,
  gridW: gridSpan,
  gridH: gridSpan,
});

export const plantStatusSchema = z.enum(["planned", "planted", "harvesting", "removed"]);

export const plantSchema = z
  .object({
    gardenId: z.string().min(1),
    // Null when the plant stands on the plan rather than in a bed.
    bedId: z.string().min(1).nullable().optional(),
    catalogId: z.string().min(1).nullable().optional(),
    freeformName: z.string().trim().max(80).optional().or(z.literal("")),
    variety: z.string().trim().max(80).optional().or(z.literal("")),
    quantity: z.coerce.number().int().min(1).max(10_000).optional(),
    plantedDate: isoDate.optional().or(z.literal("")),
    expectedHarvestDate: isoDate.optional().or(z.literal("")),
    status: plantStatusSchema.default("planned"),
    gridX: gridCoord.nullable().optional(),
    gridY: gridCoord.nullable().optional(),
    gridW: gridSpan.default(1),
    gridH: gridSpan.default(1),
  })
  // A plant is either a catalog entry or a free-text name — never neither.
  .refine((v) => Boolean(v.catalogId) || Boolean(v.freeformName), {
    message: "required",
    path: ["freeformName"],
  })
  // …and it lives either in a bed or at a spot on the plan — never nowhere.
  .refine((v) => Boolean(v.bedId) || (v.gridX != null && v.gridY != null), {
    message: "required",
    path: ["gridX"],
  });
export type PlantInput = z.infer<typeof plantSchema>;

export const plantPositionSchema = z.object({
  id: z.string().min(1),
  gridX: gridCoord,
  gridY: gridCoord,
  gridW: gridSpan,
  gridH: gridSpan,
});

/**
 * A gardener's own catalog entry. One name field only — asking for a
 * translation is friction for no gain, so it is written to both name columns.
 */
export const catalogPlantSchema = z.object({
  name: trimmed(80),
  family: z.enum(plantFamilyValues).default("other"),
  latinName: z.string().trim().max(120).optional().or(z.literal("")),
  spacingCm: z.coerce.number().int().min(1).max(1000).optional(),
  daysToMaturity: z.coerce.number().int().min(1).max(400).optional(),
  careNotes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CatalogPlantInput = z.infer<typeof catalogPlantSchema>;

export const recurrenceSchema = z.object({
  freq: z.enum(["daily", "weekly", "monthly"]),
  interval: z.coerce.number().int().min(1).max(365),
  weekdays: z.array(z.coerce.number().int().min(1).max(7)).optional(),
});

export const taskSchema = z.object({
  title: trimmed(120),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  type: z
    .enum([
      "watering",
      "fertilizing",
      "sowing",
      "planting",
      "weeding",
      "pruning",
      "harvest",
      "other",
    ])
    .default("other"),
  dueDate: isoDate,
  bedId: z.string().min(1).nullable().optional(),
  plantId: z.string().min(1).nullable().optional(),
  recurrence: recurrenceSchema.nullable().optional(),
  recurrenceEndsAt: isoDate.nullable().optional().or(z.literal("")),
});
export type TaskInput = z.infer<typeof taskSchema>;

export const progressLogSchema = z
  .object({
    note: z.string().trim().max(2000).optional().or(z.literal("")),
    occurredAt: isoDate.optional().or(z.literal("")),
    bedId: z.string().min(1).nullable().optional(),
    plantId: z.string().min(1).nullable().optional(),
    metrics: z.record(z.string().max(40), z.union([z.string().max(80), z.number()])).optional(),
    photos: z
      .array(
        z.object({
          url: z.string().url(),
          pathname: z.string().min(1),
          width: z.coerce.number().int().positive().optional(),
          height: z.coerce.number().int().positive().optional(),
        }),
      )
      .max(10)
      .default([]),
  })
  // An entry with neither a note nor a photo carries no information.
  .refine((v) => Boolean(v.note) || v.photos.length > 0, {
    message: "required",
    path: ["note"],
  });
export type ProgressLogInput = z.infer<typeof progressLogSchema>;

export const inviteSchema = z.object({
  gardenId: z.string().min(1),
  role: z.enum(["editor", "viewer"]).default("editor"),
  days: z.coerce.number().int().min(1).max(90).default(14),
  maxUses: z.coerce.number().int().min(1).max(50).default(10),
});
