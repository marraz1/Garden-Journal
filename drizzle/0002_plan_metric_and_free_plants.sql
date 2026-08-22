-- Hand-edited after generation: drizzle-kit emitted a bare
-- `ADD COLUMN "garden_id" text NOT NULL`, which cannot run against the existing
-- rows. It is split below into add / backfill from "bed" / set not null.
DROP INDEX "plant_catalog_name_lt_idx";--> statement-breakpoint
ALTER TABLE "plant" ALTER COLUMN "bed_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "plant_catalog" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "plant" ADD COLUMN "garden_id" text;--> statement-breakpoint
UPDATE "plant" SET "garden_id" = "bed"."garden_id" FROM "bed" WHERE "bed"."id" = "plant"."bed_id";--> statement-breakpoint
ALTER TABLE "plant" ALTER COLUMN "garden_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "plant" ADD COLUMN "grid_x" integer;--> statement-breakpoint
ALTER TABLE "plant" ADD COLUMN "grid_y" integer;--> statement-breakpoint
ALTER TABLE "plant" ADD COLUMN "grid_w" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "plant" ADD COLUMN "grid_h" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "plant_catalog" ADD CONSTRAINT "plant_catalog_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant" ADD CONSTRAINT "plant_garden_id_garden_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."garden"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "plant_catalog_owner_name_idx" ON "plant_catalog" USING btree ("created_by_user_id","name_lt");--> statement-breakpoint
CREATE INDEX "plant_garden_idx" ON "plant" USING btree ("garden_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plant_catalog_name_lt_idx" ON "plant_catalog" USING btree ("name_lt") WHERE "plant_catalog"."created_by_user_id" is null;--> statement-breakpoint
ALTER TABLE "plant" ADD CONSTRAINT "plant_placement_check" CHECK ("plant"."bed_id" is not null or ("plant"."grid_x" is not null and "plant"."grid_y" is not null));