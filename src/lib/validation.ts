import { z } from "zod";

/** Shared between the client forms (React Hook Form) and the server actions. */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate");
const trimmed = (max: number) => z.string().trim().min(1, "required").max(max, "tooLong");

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
  gridCols: z.coerce.number().int().min(4).max(30).default(12),
  gridRows: z.coerce.number().int().min(4).max(30).default(12),
});
export type GardenInput = z.infer<typeof gardenSchema>;

export const plantFamilyValues = [
  "leafy",
  "nightshade",
  "root",
  "legume",
  "brassica",
  "allium",
  "cucurbit",
  "herb",
  "berry",
  "other",
] as const;

export const bedSchema = z.object({
  name: trimmed(60),
  gridX: z.coerce.number().int().min(0).max(60).default(0),
  gridY: z.coerce.number().int().min(0).max(60).default(0),
  gridW: z.coerce.number().int().min(1).max(30).default(2),
  gridH: z.coerce.number().int().min(1).max(30).default(1),
  colorKey: z.enum(plantFamilyValues).nullable().optional(),
  sunExposure: z.enum(["full", "partial", "shade"]).nullable().optional(),
  soilType: z.string().trim().max(60).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type BedInput = z.infer<typeof bedSchema>;

export const bedPositionSchema = z.object({
  id: z.string().min(1),
  gridX: z.coerce.number().int().min(0).max(60),
  gridY: z.coerce.number().int().min(0).max(60),
  gridW: z.coerce.number().int().min(1).max(30),
  gridH: z.coerce.number().int().min(1).max(30),
});

export const plantSchema = z
  .object({
    bedId: z.string().min(1),
    catalogId: z.string().min(1).nullable().optional(),
    freeformName: z.string().trim().max(80).optional().or(z.literal("")),
    variety: z.string().trim().max(80).optional().or(z.literal("")),
    quantity: z.coerce.number().int().min(1).max(10_000).optional(),
    plantedDate: isoDate.optional().or(z.literal("")),
    expectedHarvestDate: isoDate.optional().or(z.literal("")),
    status: z.enum(["planned", "planted", "harvesting", "removed"]).default("planned"),
  })
  // A plant is either a catalog entry or a free-text name — never neither.
  .refine((v) => Boolean(v.catalogId) || Boolean(v.freeformName), {
    message: "required",
    path: ["freeformName"],
  });
export type PlantInput = z.infer<typeof plantSchema>;

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
