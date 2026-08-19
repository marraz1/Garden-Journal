"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireGardenAccess } from "@/lib/guards";
import { taskSchema } from "@/lib/validation";
import { nextDueDate } from "@/lib/recurrence";
import { fail, ok, withAction, type ActionResult } from "@/lib/action-result";

function revalidateTaskViews() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/plan");
}

async function loadTask(taskId: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return task ?? null;
}

export async function createTask(
  gardenId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return withAction(async () => {
    const { user } = await requireGardenAccess(gardenId, "editContent");

    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) {
      return fail("required", z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    const [created] = await db
      .insert(tasks)
      .values({
        gardenId,
        bedId: data.bedId || null,
        plantId: data.plantId || null,
        title: data.title,
        notes: data.notes || null,
        type: data.type,
        dueDate: data.dueDate,
        recurrence: data.recurrence ?? null,
        recurrenceEndsAt: data.recurrenceEndsAt || null,
        createdBy: user.id,
      })
      .returning({ id: tasks.id });

    // A recurring task is its own series root.
    if (data.recurrence) {
      await db.update(tasks).set({ seriesId: created.id }).where(eq(tasks.id, created.id));
    }

    revalidateTaskViews();
    return ok({ id: created.id });
  });
}

export async function updateTask(taskId: string, input: unknown): Promise<ActionResult> {
  return withAction(async () => {
    const task = await loadTask(taskId);
    if (!task) return fail("notFound");
    await requireGardenAccess(task.gardenId, "editContent");

    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) {
      return fail("required", z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
    }
    const data = parsed.data;

    await db
      .update(tasks)
      .set({
        bedId: data.bedId || null,
        plantId: data.plantId || null,
        title: data.title,
        notes: data.notes || null,
        type: data.type,
        dueDate: data.dueDate,
        recurrence: data.recurrence ?? null,
        recurrenceEndsAt: data.recurrenceEndsAt || null,
        seriesId: data.recurrence ? (task.seriesId ?? task.id) : null,
      })
      .where(eq(tasks.id, taskId));

    revalidateTaskViews();
    return ok();
  });
}

/**
 * Marks an occurrence done and materialises the next one. Returns the id of the
 * spawned task so the undo toast can remove it again.
 */
export async function completeTask(
  taskId: string,
): Promise<ActionResult<{ spawnedId: string | null; nextDate: string | null }>> {
  return withAction(async () => {
    const task = await loadTask(taskId);
    if (!task) return fail("notFound");
    const { user } = await requireGardenAccess(task.gardenId, "editContent");

    if (task.status === "done") return ok({ spawnedId: null, nextDate: null });

    await db
      .update(tasks)
      .set({ status: "done", completedAt: new Date(), completedBy: user.id })
      .where(eq(tasks.id, taskId));

    let spawnedId: string | null = null;
    const next = nextDueDate(task.recurrence, task.dueDate, task.recurrenceEndsAt);

    if (next) {
      const [spawned] = await db
        .insert(tasks)
        .values({
          gardenId: task.gardenId,
          bedId: task.bedId,
          plantId: task.plantId,
          title: task.title,
          notes: task.notes,
          type: task.type,
          dueDate: next,
          recurrence: task.recurrence,
          recurrenceEndsAt: task.recurrenceEndsAt,
          seriesId: task.seriesId ?? task.id,
          createdBy: task.createdBy,
        })
        .returning({ id: tasks.id });
      spawnedId = spawned.id;
    }

    revalidateTaskViews();
    return ok({ spawnedId, nextDate: next });
  });
}

/** Undo for `completeTask`: reopen the occurrence and drop the spawned one. */
export async function reopenTask(taskId: string, spawnedId?: string): Promise<ActionResult> {
  return withAction(async () => {
    const task = await loadTask(taskId);
    if (!task) return fail("notFound");
    await requireGardenAccess(task.gardenId, "editContent");

    await db
      .update(tasks)
      .set({ status: "open", completedAt: null, completedBy: null })
      .where(eq(tasks.id, taskId));

    if (spawnedId) {
      await db
        .delete(tasks)
        .where(
          and(eq(tasks.id, spawnedId), eq(tasks.gardenId, task.gardenId), eq(tasks.status, "open")),
        );
    }

    revalidateTaskViews();
    return ok();
  });
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  return withAction(async () => {
    const task = await loadTask(taskId);
    if (!task) return fail("notFound");
    await requireGardenAccess(task.gardenId, "editContent");

    await db.delete(tasks).where(eq(tasks.id, taskId));

    revalidateTaskViews();
    return ok();
  });
}
