"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowRight, Pencil, Plus, Sun, Trash2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { deleteBed } from "@/actions/beds";
import { deletePlant, updatePlantStatus } from "@/actions/plants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FAMILY_COLOR_VAR } from "@/lib/plant-families";
import { cellsToArea } from "@/lib/plan-geometry";
import type { BedWithPlants } from "@/lib/queries/beds";
import { AddPlantDialog } from "@/components/plants/add-plant-dialog";

type PlantStatus = "planned" | "planted" | "harvesting" | "removed";

/**
 * Tapping a bed opens this quick card rather than navigating away — the design
 * spec asks for a peek that can be dismissed with one thumb.
 */
export function BedSheet({
  bed,
  gardenId,
  canEdit,
  onOpenChange,
  onEdit,
}: {
  bed: BedWithPlants | null;
  gardenId: string;
  canEdit: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (bed: BedWithPlants) => void;
}) {
  const t = useTranslations("beds");
  const tPlants = useTranslations("plants");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addPlantOpen, setAddPlantOpen] = useState(false);

  if (!bed) return null;

  const sunLabel =
    bed.sunExposure === "full"
      ? t("sunFull")
      : bed.sunExposure === "partial"
        ? t("sunPartial")
        : bed.sunExposure === "shade"
          ? t("sunShade")
          : null;

  function run(action: () => Promise<{ ok: boolean; error?: string }>, close = false) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(tErr((result.error ?? "generic") as "generic"));
        return;
      }
      if (close) onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <>
      <Sheet open={Boolean(bed)} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+1rem)]"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: FAMILY_COLOR_VAR[bed.family] }}
              />
              {bed.name}
            </SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-2">
              <span>
                {t("dimensions", {
                  w: bed.gridW,
                  h: bed.gridH,
                  area: cellsToArea(bed.gridW, bed.gridH),
                })}
              </span>
              {sunLabel && (
                <span className="flex items-center gap-1">
                  <Sun className="size-3.5" aria-hidden />
                  {sunLabel}
                </span>
              )}
              {bed.soilType && <span>{bed.soilType}</span>}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4">
            {bed.notes && <p className="text-sm text-muted-foreground">{bed.notes}</p>}

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">{tPlants("title")}</h3>

              {bed.plants.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tPlants("empty")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {bed.plants.map((plant) => (
                    <li
                      key={plant.id}
                      className="flex items-center gap-2 rounded-xl border border-border/70 p-2"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: FAMILY_COLOR_VAR[plant.family] }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {plant.name}
                      </span>

                      {canEdit ? (
                        <Select
                          value={plant.status}
                          disabled={pending}
                          onValueChange={(value) =>
                            run(() => updatePlantStatus(plant.id, value as PlantStatus))
                          }
                        >
                          <SelectTrigger className="h-9 w-32" aria-label={tPlants("title")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">{tPlants("statusPlanned")}</SelectItem>
                            <SelectItem value="planted">{tPlants("statusPlanted")}</SelectItem>
                            <SelectItem value="harvesting">
                              {tPlants("statusHarvesting")}
                            </SelectItem>
                            <SelectItem value="removed">{tPlants("statusRemoved")}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">{plant.status}</Badge>
                      )}

                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon-touch"
                          aria-label={tc("delete")}
                          disabled={pending}
                          onClick={() => run(() => deletePlant(plant.id))}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Button asChild variant="outline" size="touch" className="self-start">
              <Link href={`/beds/${bed.id}`}>
                <ArrowRight className="size-4" aria-hidden />
                {t("openBed")}
              </Link>
            </Button>

            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button size="touch" onClick={() => setAddPlantOpen(true)}>
                  <Plus className="size-4" aria-hidden />
                  {tPlants("add")}
                </Button>
                <Button variant="outline" size="touch" onClick={() => onEdit(bed)}>
                  <Pencil className="size-4" aria-hidden />
                  {tc("edit")}
                </Button>
                <Button
                  variant="destructive"
                  size="touch"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm(t("deleteConfirm"))) return;
                    run(() => deleteBed(bed.id), true);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                  {tc("delete")}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AddPlantDialog
        gardenId={gardenId}
        bedId={bed.id}
        open={addPlantOpen}
        onOpenChange={setAddPlantOpen}
      />
    </>
  );
}
