import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

/* -------------------------------------------------------------------------- */
/* Auth.js adapter tables                                                     */
/* -------------------------------------------------------------------------- */

export const users = pgTable("user", {
  id: id(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // Null for accounts created through an OAuth provider — those users have no
  // password to check. Never selected into anything the client can see.
  passwordHash: text("password_hash"),
  // Preferred UI locale, remembered across devices.
  locale: text("locale"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Password reset links. Only a SHA-256 hash of the token is stored, so a leaked
 * database snapshot cannot be used to take over accounts; the raw token exists
 * only in the email that was sent.
 */
export const passwordResetTokens = pgTable(
  "password_reset_token",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("password_reset_token_hash_idx").on(t.tokenHash),
    index("password_reset_token_user_idx").on(t.userId),
  ],
);

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const memberRole = pgEnum("member_role", ["owner", "editor", "viewer"]);
export const sunExposure = pgEnum("sun_exposure", ["full", "partial", "shade"]);
export const plantStatus = pgEnum("plant_status", ["planned", "planted", "harvesting", "removed"]);
export const taskType = pgEnum("task_type", [
  "watering",
  "fertilizing",
  "sowing",
  "planting",
  "weeding",
  "pruning",
  "harvest",
  "other",
]);
export const taskStatus = pgEnum("task_status", ["open", "done", "skipped"]);
export const plantFamily = pgEnum("plant_family", [
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
]);

/* -------------------------------------------------------------------------- */
/* Gardens and membership                                                     */
/* -------------------------------------------------------------------------- */

export const gardens = pgTable(
  "garden",
  {
    id: id(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: text("location"),
    sizeM2: integer("size_m2"),
    // Plan editor canvas size, in grid cells.
    gridCols: integer("grid_cols").notNull().default(12),
    gridRows: integer("grid_rows").notNull().default(12),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("garden_owner_idx").on(t.ownerId)],
);

export const gardenMembers = pgTable(
  "garden_member",
  {
    gardenId: text("garden_id")
      .notNull()
      .references(() => gardens.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("viewer"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.gardenId, t.userId] }),
    index("garden_member_user_idx").on(t.userId),
  ],
);

export const gardenInvites = pgTable(
  "garden_invite",
  {
    id: id(),
    gardenId: text("garden_id")
      .notNull()
      .references(() => gardens.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    role: memberRole("role").notNull().default("editor"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    maxUses: integer("max_uses").notNull().default(10),
    useCount: integer("use_count").notNull().default(0),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("garden_invite_token_idx").on(t.token),
    index("garden_invite_garden_idx").on(t.gardenId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Beds, catalog, plants                                                      */
/* -------------------------------------------------------------------------- */

export const beds = pgTable(
  "bed",
  {
    id: id(),
    gardenId: text("garden_id")
      .notNull()
      .references(() => gardens.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    gridX: integer("grid_x").notNull().default(0),
    gridY: integer("grid_y").notNull().default(0),
    gridW: integer("grid_w").notNull().default(2),
    gridH: integer("grid_h").notNull().default(1),
    // Explicit colour override; when null the dominant plant family decides.
    colorKey: plantFamily("color_key"),
    sunExposure: sunExposure("sun_exposure"),
    soilType: text("soil_type"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bed_garden_idx").on(t.gardenId)],
);

export const plantCatalog = pgTable(
  "plant_catalog",
  {
    id: id(),
    nameLt: text("name_lt").notNull(),
    nameEn: text("name_en").notNull(),
    latinName: text("latin_name"),
    family: plantFamily("family").notNull().default("other"),
    spacingCm: integer("spacing_cm"),
    daysToMaturity: integer("days_to_maturity"),
    // Lithuanian climate windows, stored as month numbers 1-12.
    sowFromMonth: integer("sow_from_month"),
    sowToMonth: integer("sow_to_month"),
    harvestFromMonth: integer("harvest_from_month"),
    harvestToMonth: integer("harvest_to_month"),
    careNotesLt: text("care_notes_lt"),
    careNotesEn: text("care_notes_en"),
  },
  (t) => [
    index("plant_catalog_family_idx").on(t.family),
    // Lets `npm run db:seed` upsert rather than duplicate on every run.
    uniqueIndex("plant_catalog_name_lt_idx").on(t.nameLt),
  ],
);

export const plants = pgTable(
  "plant",
  {
    id: id(),
    bedId: text("bed_id")
      .notNull()
      .references(() => beds.id, { onDelete: "cascade" }),
    catalogId: text("catalog_id").references(() => plantCatalog.id, { onDelete: "set null" }),
    // Used when the plant is not in the catalog.
    freeformName: text("freeform_name"),
    variety: text("variety"),
    quantity: integer("quantity"),
    plantedDate: date("planted_date"),
    expectedHarvestDate: date("expected_harvest_date"),
    status: plantStatus("status").notNull().default("planned"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("plant_bed_idx").on(t.bedId), index("plant_harvest_idx").on(t.expectedHarvestDate)],
);

/* -------------------------------------------------------------------------- */
/* Tasks                                                                      */
/* -------------------------------------------------------------------------- */

export const tasks = pgTable(
  "task",
  {
    id: id(),
    gardenId: text("garden_id")
      .notNull()
      .references(() => gardens.id, { onDelete: "cascade" }),
    bedId: text("bed_id").references(() => beds.id, { onDelete: "cascade" }),
    plantId: text("plant_id").references(() => plants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    type: taskType("type").notNull().default("other"),
    dueDate: date("due_date").notNull(),
    // Serialised RecurrenceRule (see src/lib/recurrence.ts); null = one-off.
    recurrence: jsonb("recurrence").$type<{
      freq: "daily" | "weekly" | "monthly";
      interval: number;
      weekdays?: number[];
    }>(),
    recurrenceEndsAt: date("recurrence_ends_at"),
    // Shared id across every occurrence generated from one recurring task.
    seriesId: text("series_id"),
    status: taskStatus("status").notNull().default("open"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: text("completed_by").references(() => users.id, { onDelete: "set null" }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("task_garden_due_idx").on(t.gardenId, t.dueDate),
    index("task_status_idx").on(t.gardenId, t.status),
    index("task_bed_idx").on(t.bedId),
    index("task_plant_idx").on(t.plantId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Progress journal                                                           */
/* -------------------------------------------------------------------------- */

export const progressLogs = pgTable(
  "progress_log",
  {
    id: id(),
    gardenId: text("garden_id")
      .notNull()
      .references(() => gardens.id, { onDelete: "cascade" }),
    bedId: text("bed_id").references(() => beds.id, { onDelete: "set null" }),
    plantId: text("plant_id").references(() => plants.id, { onDelete: "set null" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    note: text("note"),
    // Optional free-form measurements: harvest weight, height, etc.
    metrics: jsonb("metrics").$type<Record<string, number | string>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("progress_log_garden_idx").on(t.gardenId, t.occurredAt),
    index("progress_log_bed_idx").on(t.bedId),
    index("progress_log_plant_idx").on(t.plantId),
  ],
);

export const progressPhotos = pgTable(
  "progress_photo",
  {
    id: id(),
    logId: text("log_id")
      .notNull()
      .references(() => progressLogs.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    pathname: text("pathname").notNull(),
    width: integer("width"),
    height: integer("height"),
    sortOrder: integer("sort_order").notNull().default(0),
    isCover: boolean("is_cover").notNull().default(false),
  },
  (t) => [index("progress_photo_log_idx").on(t.logId)],
);

/* -------------------------------------------------------------------------- */
/* Inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type Garden = typeof gardens.$inferSelect;
export type GardenMember = typeof gardenMembers.$inferSelect;
export type GardenInvite = typeof gardenInvites.$inferSelect;
export type Bed = typeof beds.$inferSelect;
export type PlantCatalogEntry = typeof plantCatalog.$inferSelect;
export type Plant = typeof plants.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ProgressLog = typeof progressLogs.$inferSelect;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type MemberRole = (typeof memberRole.enumValues)[number];
export type PlantFamily = (typeof plantFamily.enumValues)[number];
export type TaskType = (typeof taskType.enumValues)[number];

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
