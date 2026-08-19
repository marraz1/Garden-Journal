CREATE TYPE "public"."member_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."plant_family" AS ENUM('leafy', 'nightshade', 'root', 'legume', 'brassica', 'allium', 'cucurbit', 'herb', 'berry', 'other');--> statement-breakpoint
CREATE TYPE "public"."plant_status" AS ENUM('planned', 'planted', 'harvesting', 'removed');--> statement-breakpoint
CREATE TYPE "public"."sun_exposure" AS ENUM('full', 'partial', 'shade');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'done', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('watering', 'fertilizing', 'sowing', 'planting', 'weeding', 'pruning', 'harvest', 'other');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "bed" (
	"id" text PRIMARY KEY NOT NULL,
	"garden_id" text NOT NULL,
	"name" text NOT NULL,
	"grid_x" integer DEFAULT 0 NOT NULL,
	"grid_y" integer DEFAULT 0 NOT NULL,
	"grid_w" integer DEFAULT 2 NOT NULL,
	"grid_h" integer DEFAULT 1 NOT NULL,
	"color_key" "plant_family",
	"sun_exposure" "sun_exposure",
	"soil_type" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "garden_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"garden_id" text NOT NULL,
	"token" text NOT NULL,
	"role" "member_role" DEFAULT 'editor' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"max_uses" integer DEFAULT 10 NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "garden_member" (
	"garden_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" DEFAULT 'viewer' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "garden_member_garden_id_user_id_pk" PRIMARY KEY("garden_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "garden" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"size_m2" integer,
	"grid_cols" integer DEFAULT 12 NOT NULL,
	"grid_rows" integer DEFAULT 12 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name_lt" text NOT NULL,
	"name_en" text NOT NULL,
	"latin_name" text,
	"family" "plant_family" DEFAULT 'other' NOT NULL,
	"spacing_cm" integer,
	"days_to_maturity" integer,
	"sow_from_month" integer,
	"sow_to_month" integer,
	"harvest_from_month" integer,
	"harvest_to_month" integer,
	"care_notes_lt" text,
	"care_notes_en" text
);
--> statement-breakpoint
CREATE TABLE "plant" (
	"id" text PRIMARY KEY NOT NULL,
	"bed_id" text NOT NULL,
	"catalog_id" text,
	"freeform_name" text,
	"variety" text,
	"quantity" integer,
	"planted_date" date,
	"expected_harvest_date" date,
	"status" "plant_status" DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_log" (
	"id" text PRIMARY KEY NOT NULL,
	"garden_id" text NOT NULL,
	"bed_id" text,
	"plant_id" text,
	"author_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"metrics" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_photo" (
	"id" text PRIMARY KEY NOT NULL,
	"log_id" text NOT NULL,
	"url" text NOT NULL,
	"pathname" text NOT NULL,
	"width" integer,
	"height" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"garden_id" text NOT NULL,
	"bed_id" text,
	"plant_id" text,
	"title" text NOT NULL,
	"notes" text,
	"type" "task_type" DEFAULT 'other' NOT NULL,
	"due_date" date NOT NULL,
	"recurrence" jsonb,
	"recurrence_ends_at" date,
	"series_id" text,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"locale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed" ADD CONSTRAINT "bed_garden_id_garden_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."garden"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garden_invite" ADD CONSTRAINT "garden_invite_garden_id_garden_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."garden"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garden_invite" ADD CONSTRAINT "garden_invite_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garden_member" ADD CONSTRAINT "garden_member_garden_id_garden_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."garden"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garden_member" ADD CONSTRAINT "garden_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garden" ADD CONSTRAINT "garden_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant" ADD CONSTRAINT "plant_bed_id_bed_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."bed"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant" ADD CONSTRAINT "plant_catalog_id_plant_catalog_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."plant_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_log" ADD CONSTRAINT "progress_log_garden_id_garden_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."garden"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_log" ADD CONSTRAINT "progress_log_bed_id_bed_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."bed"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_log" ADD CONSTRAINT "progress_log_plant_id_plant_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_log" ADD CONSTRAINT "progress_log_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_photo" ADD CONSTRAINT "progress_photo_log_id_progress_log_id_fk" FOREIGN KEY ("log_id") REFERENCES "public"."progress_log"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_garden_id_garden_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."garden"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_bed_id_bed_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."bed"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_plant_id_plant_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bed_garden_idx" ON "bed" USING btree ("garden_id");--> statement-breakpoint
CREATE UNIQUE INDEX "garden_invite_token_idx" ON "garden_invite" USING btree ("token");--> statement-breakpoint
CREATE INDEX "garden_invite_garden_idx" ON "garden_invite" USING btree ("garden_id");--> statement-breakpoint
CREATE INDEX "garden_member_user_idx" ON "garden_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "garden_owner_idx" ON "garden" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "plant_catalog_family_idx" ON "plant_catalog" USING btree ("family");--> statement-breakpoint
CREATE UNIQUE INDEX "plant_catalog_name_lt_idx" ON "plant_catalog" USING btree ("name_lt");--> statement-breakpoint
CREATE INDEX "plant_bed_idx" ON "plant" USING btree ("bed_id");--> statement-breakpoint
CREATE INDEX "plant_harvest_idx" ON "plant" USING btree ("expected_harvest_date");--> statement-breakpoint
CREATE INDEX "progress_log_garden_idx" ON "progress_log" USING btree ("garden_id","occurred_at");--> statement-breakpoint
CREATE INDEX "progress_log_bed_idx" ON "progress_log" USING btree ("bed_id");--> statement-breakpoint
CREATE INDEX "progress_log_plant_idx" ON "progress_log" USING btree ("plant_id");--> statement-breakpoint
CREATE INDEX "progress_photo_log_idx" ON "progress_photo" USING btree ("log_id");--> statement-breakpoint
CREATE INDEX "task_garden_due_idx" ON "task" USING btree ("garden_id","due_date");--> statement-breakpoint
CREATE INDEX "task_status_idx" ON "task" USING btree ("garden_id","status");--> statement-breakpoint
CREATE INDEX "task_bed_idx" ON "task" USING btree ("bed_id");--> statement-breakpoint
CREATE INDEX "task_plant_idx" ON "task" USING btree ("plant_id");