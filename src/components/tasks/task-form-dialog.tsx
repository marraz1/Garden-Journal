"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createTask, updateTask } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { todayInAppZone } from "@/lib/dates";
import type { TaskRow } from "@/lib/queries/tasks";
import type { TaskTargets } from "@/lib/queries/tasks";
import type { TaskType } from "@/db/schema";

const TASK_TYPES: TaskType[] = [
  "watering",
  "fertilizing",
  "sowing",
  "planting",
  "weeding",
  "pruning",
  "harvest",
  "other",
];

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

/** Localised initial for an ISO weekday. 2024-01-01 was a Monday. */
function weekdayLabel(isoDay: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(
    new Date(Date.UTC(2024, 0, isoDay)),
  );
}

export function TaskFormDialog({
  gardenId,
  task,
  targets,
  open,
  onOpenChange,
}: {
  gardenId: string;
  task?: TaskRow;
  targets: TaskTargets;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("tasks");
  const tRec = useTranslations("tasks.recurrence");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Only title and date are required; the rest hides behind "more".
  const [title, setTitle] = useState(task?.title ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? todayInAppZone());
  const [showMore, setShowMore] = useState(false);
  const [type, setType] = useState<TaskType>(task?.type ?? "other");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [bedId, setBedId] = useState(task?.bedId ?? "none");
  const [plantId, setPlantId] = useState(task?.plantId ?? "none");
  const [freq, setFreq] = useState<"none" | "daily" | "weekly" | "monthly">(
    task?.recurrence?.freq ?? "none",
  );
  const [interval, setInterval] = useState(task?.recurrence?.interval ?? 1);
  const [weekdays, setWeekdays] = useState<number[]>(task?.recurrence?.weekdays ?? []);

  const plantOptions = targets.plants.filter((plant) => bedId === "none" || plant.bedId === bedId);

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      title,
      dueDate,
      type,
      notes,
      bedId: bedId === "none" ? null : bedId,
      plantId: plantId === "none" ? null : plantId,
      recurrence:
        freq === "none"
          ? null
          : {
              freq,
              interval,
              weekdays: freq === "weekly" && weekdays.length > 0 ? weekdays : undefined,
            },
    };

    startTransition(async () => {
      const result = task
        ? await updateTask(task.id, payload)
        : await createTask(gardenId, payload);
      if (!result.ok) {
        toast.error(tErr(result.error));
        return;
      }
      onOpenChange(false);
      if (!task) {
        setTitle("");
        setNotes("");
        setFreq("none");
        setWeekdays([]);
      }
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? tc("edit") : t("add")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-title">{t("titleField")}</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              required
              autoFocus
              className="h-11 text-base"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="task-date">{t("dueDate")}</Label>
            <Input
              id="task-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              required
              className="h-11 text-base"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowMore((value) => !value)}
            className="flex items-center gap-1 self-start text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={`size-4 transition-transform ${showMore ? "rotate-180" : ""}`}
              aria-hidden
            />
            {showMore ? tc("less") : tc("more")}
          </button>

          {showMore && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("type")}</Label>
                <Select value={type} onValueChange={(value) => setType(value as TaskType)}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`type${value.charAt(0).toUpperCase()}${value.slice(1)}` as "typeOther")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>{t("linkToBed")}</Label>
                <Select
                  value={bedId}
                  onValueChange={(value) => {
                    setBedId(value);
                    setPlantId("none");
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tc("none")}</SelectItem>
                    {targets.beds.map((bed) => (
                      <SelectItem key={bed.id} value={bed.id}>
                        {bed.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {plantOptions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label>{t("linkToPlant")}</Label>
                  <Select value={plantId} onValueChange={setPlantId}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tc("none")}</SelectItem>
                      {plantOptions.map((plant) => (
                        <SelectItem key={plant.id} value={plant.id}>
                          {plant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-sm font-medium">{tRec("label")}</legend>

                <Select value={freq} onValueChange={(value) => setFreq(value as typeof freq)}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tRec("none")}</SelectItem>
                    <SelectItem value="daily">{tRec("daily")}</SelectItem>
                    <SelectItem value="weekly">{tRec("weekly")}</SelectItem>
                    <SelectItem value="monthly">{tRec("monthly")}</SelectItem>
                  </SelectContent>
                </Select>

                {freq !== "none" && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="task-interval" className="text-sm">
                      {tRec("interval")}
                    </Label>
                    <Input
                      id="task-interval"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={365}
                      value={interval}
                      onChange={(event) => setInterval(Number(event.target.value) || 1)}
                      className="h-11 w-24 text-base"
                    />
                  </div>
                )}

                {freq === "weekly" && (
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((day) => {
                      const active = weekdays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            setWeekdays((current) =>
                              active ? current.filter((d) => d !== day) : [...current, day],
                            )
                          }
                          className={`size-11 tap-target rounded-xl border text-sm font-medium transition-colors ${
                            active
                              ? "border-transparent bg-primary text-primary-foreground"
                              : "border-border hover:bg-accent"
                          }`}
                        >
                          {weekdayLabel(day, locale)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </fieldset>

              <div className="flex flex-col gap-2">
                <Label htmlFor="task-notes">
                  {t("notes")} ({tc("optional")})
                </Label>
                <Textarea
                  id="task-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={500}
                  rows={3}
                  className="text-base"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" size="touch" disabled={pending || !title.trim()}>
              {pending ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
