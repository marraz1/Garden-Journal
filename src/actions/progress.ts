"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { progressLogs, progressPhotos } from "@/db/schema";
import { requireGardenAccess } from "@/lib/guards";
import { progressLogSchema } from "@/lib/validation";
import { fail, ok, withAction, type ActionResult } from "@/lib/action-result";

export async function createProgressLog(
  gardenId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const { user } = await requireGardenAccess(gardenId, "editContent");

    const parsed = progressLogSchema.safeParse(input);
    if (!parsed.success) {
      return fail("required", z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    const logId = await db.transaction(async (tx) => {
      const [log] = await tx
        .insert(progressLogs)
        .values({
          gardenId,
          bedId: data.bedId || null,
          plantId: data.plantId || null,
          authorId: user.id,
          occurredAt: data.occurredAt ? new Date(`${data.occurredAt}T12:00:00Z`) : new Date(),
          note: data.note || null,
          metrics: data.metrics ?? null,
        })
        .returning({ id: progressLogs.id });

      if (data.photos.length > 0) {
        await tx.insert(progressPhotos).values(
          data.photos.map((photo, index) => ({
            logId: log.id,
            url: photo.url,
            pathname: photo.pathname,
            width: photo.width ?? null,
            height: photo.height ?? null,
            sortOrder: index,
            isCover: index === 0,
          })),
        );
      }

      return log.id;
    });

    revalidatePath("/progress");
    revalidatePath("/");
    return ok({ id: logId });
  });
}

export async function deleteProgressLog(logId: string): Promise<ActionResult> {
  return withAction(async () => {
    const [log] = await db
      .select({ gardenId: progressLogs.gardenId })
      .from(progressLogs)
      .where(eq(progressLogs.id, logId))
      .limit(1);
    if (!log) return fail("notFound");

    await requireGardenAccess(log.gardenId, "editContent");

    const photos = await db
      .select({ url: progressPhotos.url })
      .from(progressPhotos)
      .where(eq(progressPhotos.logId, logId));

    // Photo rows cascade with the log; the blobs need an explicit delete.
    // A failure there must not leave the entry undeletable.
    if (photos.length > 0 && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await del(photos.map((photo) => photo.url));
      } catch (error) {
        console.error("[progress] blob cleanup failed", error);
      }
    }

    await db.delete(progressLogs).where(eq(progressLogs.id, logId));

    revalidatePath("/progress");
    revalidatePath("/");
    return ok();
  });
}
