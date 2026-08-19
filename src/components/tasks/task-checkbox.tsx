"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { completeTask, reopenTask } from "@/actions/tasks";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * One tap marks a task done — no confirmation dialog, per the design spec. The
 * undo lives in the toast instead, which also removes any spawned occurrence.
 */
export function TaskCheckbox({
  taskId,
  defaultChecked = false,
  readOnly = false,
}: {
  taskId: string;
  defaultChecked?: boolean;
  readOnly?: boolean;
}) {
  const t = useTranslations("tasks");
  const tErr = useTranslations("errors");
  const [, startTransition] = useTransition();
  const [checked, setChecked] = useOptimistic(defaultChecked);

  function onCheckedChange(next: boolean) {
    startTransition(async () => {
      setChecked(next);

      if (!next) {
        const result = await reopenTask(taskId);
        if (!result.ok) toast.error(tErr(result.error));
        return;
      }

      const result = await completeTask(taskId);
      if (!result.ok) {
        toast.error(tErr(result.error));
        return;
      }

      toast.success(t("done"), {
        description: result.data.nextDate
          ? t("nextOccurrence", { date: result.data.nextDate })
          : undefined,
        action: {
          label: t("undo"),
          onClick: () => {
            startTransition(async () => {
              setChecked(false);
              await reopenTask(taskId, result.data.spawnedId ?? undefined);
            });
          },
        },
      });
    });
  }

  return (
    <Checkbox
      checked={checked}
      disabled={readOnly}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      aria-label={t("markDone")}
      // Enlarged hit area: the control is 20px but the tap target is 44px.
      className="relative size-5 shrink-0 before:absolute before:-inset-3 before:content-['']"
    />
  );
}
