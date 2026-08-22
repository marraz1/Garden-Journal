"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { updatePlanSize } from "@/actions/gardens";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_GRID,
  MIN_GRID,
  cellsToArea,
  clampRect,
  rectChanged,
  type Rect,
} from "@/lib/plan-geometry";

/**
 * Width and height of the plan, in metres. Resizing is an owner action, so this
 * is only ever rendered behind `can(role, "manageGarden")`.
 */
export function PlanSizeDialog({
  gardenId,
  cols,
  rows,
  occupied,
  open,
  onOpenChange,
}: {
  gardenId: string;
  cols: number;
  rows: number;
  /** Beds and placed plants, so a shrink can be previewed before it happens. */
  occupied: Rect[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("garden");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [width, setWidth] = useState(String(cols));
  const [height, setHeight] = useState(String(rows));

  const nextCols = Number(width);
  const nextRows = Number(height);
  const valid =
    Number.isInteger(nextCols) &&
    Number.isInteger(nextRows) &&
    nextCols >= MIN_GRID &&
    nextCols <= MAX_GRID &&
    nextRows >= MIN_GRID &&
    nextRows <= MAX_GRID;

  // Same clamp the server will apply, so the warning cannot disagree with it.
  const wouldMove = valid
    ? occupied.filter((rect) => rectChanged(rect, clampRect(rect, nextCols, nextRows))).length
    : 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await updatePlanSize(gardenId, { gridCols: nextCols, gridRows: nextRows });
      if (!result.ok) {
        toast.error(tErr(result.error as "generic"));
        return;
      }

      toast.success(
        result.data.moved > 0
          ? t("planResizedMoved", { count: result.data.moved })
          : t("planResized"),
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("gridSize")}</DialogTitle>
          <DialogDescription>{t("planScaleHint")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-width">{t("gridCols")}</Label>
              <Input
                id="plan-width"
                type="number"
                inputMode="numeric"
                min={MIN_GRID}
                max={MAX_GRID}
                value={width}
                onChange={(event) => setWidth(event.target.value)}
                required
                autoFocus
                className="h-11 text-base"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-height">{t("gridRows")}</Label>
              <Input
                id="plan-height"
                type="number"
                inputMode="numeric"
                min={MIN_GRID}
                max={MAX_GRID}
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                required
                className="h-11 text-base"
              />
            </div>
          </div>

          {valid && (
            <p className="text-sm text-muted-foreground">
              {t("planArea", {
                cols: nextCols,
                rows: nextRows,
                area: cellsToArea(nextCols, nextRows),
              })}
            </p>
          )}

          {wouldMove > 0 && (
            <p className="rounded-xl bg-muted/60 p-3 text-sm">
              {t("planShrinkWarning", { count: wouldMove })}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" size="touch" disabled={pending || !valid}>
              {pending ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
