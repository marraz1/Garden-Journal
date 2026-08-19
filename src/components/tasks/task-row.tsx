"use client";

import { useTranslations } from "next-intl";
import { Pencil, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCheckbox } from "./task-checkbox";
import { describeRecurrence } from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import type { TaskRow as Task } from "@/lib/queries/tasks";

export function TaskRow({
  task,
  canEdit,
  locale,
  onEdit,
  onDelete,
}: {
  task: Task;
  canEdit: boolean;
  locale: string;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const t = useTranslations("tasks");
  const tRec = useTranslations("tasks.recurrence");
  const tc = useTranslations("common");

  const done = task.status === "done";
  const typeLabel = t(
    `type${task.type.charAt(0).toUpperCase()}${task.type.slice(1)}` as "typeOther",
  );
  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(new Date(`${task.dueDate}T12:00:00Z`));

  const recurrenceLabel = task.recurrence
    ? (() => {
        const { key, values } = describeRecurrence(task.recurrence);
        return tRec(key as "dailyEvery", values);
      })()
    : null;

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3">
      <TaskCheckbox taskId={task.id} defaultChecked={done} readOnly={!canEdit} />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[0.95rem] font-medium",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{dateLabel}</span>
          <span>·</span>
          <span>{typeLabel}</span>
          {task.bedName && (
            <>
              <span>·</span>
              <span className="truncate">{task.bedName}</span>
            </>
          )}
          {recurrenceLabel && (
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <Repeat className="size-3" aria-hidden />
              {recurrenceLabel}
            </span>
          )}
        </p>
      </div>

      {canEdit && (
        <div className="flex shrink-0">
          <Button
            variant="ghost"
            size="icon-touch"
            aria-label={tc("edit")}
            onClick={() => onEdit(task)}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-touch"
            aria-label={tc("delete")}
            onClick={() => onDelete(task)}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </li>
  );
}
