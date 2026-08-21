"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarDays, List, Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { deleteTask } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { bucketForDueDate, type DueBucket } from "@/lib/dates";
import { useQuickAddDialog } from "@/hooks/use-quick-add";
import type { TaskRow as Task, TaskTargets } from "@/lib/queries/tasks";
import { TaskRow } from "./task-row";
import { TaskCalendar } from "./task-calendar";
import { TaskFormDialog } from "./task-form-dialog";

const BUCKET_ORDER: DueBucket[] = ["overdue", "today", "thisWeek", "later"];

export function TasksView({
  gardenId,
  tasks,
  targets,
  today,
  canEdit,
}: {
  gardenId: string;
  tasks: Task[];
  targets: TaskTargets;
  today: string;
  canEdit: boolean;
}) {
  const t = useTranslations("tasks");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState(today);
  const [editing, setEditing] = useState<Task | undefined>(undefined);
  const quickAdd = useQuickAddDialog(canEdit);

  const grouped = useMemo(() => {
    const groups: Record<DueBucket, Task[]> = {
      overdue: [],
      today: [],
      thisWeek: [],
      later: [],
    };
    for (const task of tasks) {
      if (task.status === "done") continue;
      groups[bucketForDueDate(task.dueDate, today)].push(task);
    }
    return groups;
  }, [tasks, today]);

  const dayTasks = useMemo(
    () => tasks.filter((task) => task.dueDate === selectedDate),
    [tasks, selectedDate],
  );

  function remove(task: Task) {
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (!result.ok) {
        toast.error(tErr(result.error));
        return;
      }
      router.refresh();
    });
  }

  function edit(task: Task) {
    setEditing(task);
    quickAdd.setOpen(true);
  }

  const listProps = { canEdit, locale, onEdit: edit, onDelete: remove };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-muted p-1" role="tablist">
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              role="tab"
              aria-selected={view === "list"}
              onClick={() => setView("list")}
            >
              <List className="size-4" aria-hidden />
              {t("listView")}
            </Button>
            <Button
              variant={view === "calendar" ? "secondary" : "ghost"}
              size="sm"
              role="tab"
              aria-selected={view === "calendar"}
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="size-4" aria-hidden />
              {t("calendarView")}
            </Button>
          </div>

          {canEdit && (
            <Button
              size="touch"
              onClick={() => {
                setEditing(undefined);
                quickAdd.setOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              {t("add")}
            </Button>
          )}
        </div>
      </div>

      {view === "list" ? (
        <div className="flex flex-col gap-6">
          {BUCKET_ORDER.every((bucket) => grouped[bucket].length === 0) && (
            <p className="py-10 text-center text-muted-foreground">{t("empty")}</p>
          )}

          {BUCKET_ORDER.map((bucket) =>
            grouped[bucket].length === 0 ? null : (
              <section key={bucket} className="flex flex-col gap-2">
                <h2
                  className={`text-xs font-semibold tracking-wide uppercase ${
                    bucket === "overdue" ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {t(bucket)}
                </h2>
                <ul className="flex flex-col gap-2">
                  {grouped[bucket].map((task) => (
                    <TaskRow key={task.id} task={task} {...listProps} />
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <TaskCalendar
            tasks={tasks}
            today={today}
            locale={locale}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {dayTasks.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {dayTasks.map((task) => (
                <TaskRow key={task.id} task={task} {...listProps} />
              ))}
            </ul>
          )}
        </div>
      )}

      <TaskFormDialog
        key={editing?.id ?? "new"}
        gardenId={gardenId}
        task={editing}
        targets={targets}
        open={quickAdd.open}
        onOpenChange={quickAdd.setOpen}
      />
    </div>
  );
}
