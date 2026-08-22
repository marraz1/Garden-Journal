"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { deletePlant, updatePlantStatus } from "@/actions/plants";
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
import { cellsToArea } from "@/lib/plan-geometry";
import { FamilyDot } from "./family-select";
import type { PlacedPlant } from "@/lib/queries/beds";

type PlantStatus = "planned" | "planted" | "harvesting" | "removed";

/** The peek card for a plant standing on the plan rather than inside a bed. */
export function PlantSheet({
  plant,
  canEdit,
  onOpenChange,
}: {
  plant: PlacedPlant | null;
  canEdit: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("plants");
  const tBeds = useTranslations("beds");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!plant) return null;

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

  // Spacing is per plant in a row, so a square metre holds the square of it.
  const perSquareMetre = plant.spacingCm ? Math.floor(100 / plant.spacingCm) ** 2 || null : null;

  return (
    <Sheet open={Boolean(plant)} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FamilyDot family={plant.family} />
            {plant.name}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2">
            <span>
              {tBeds("dimensions", {
                w: plant.gridW,
                h: plant.gridH,
                area: cellsToArea(plant.gridW, plant.gridH),
              })}
            </span>
            <span>{t("standalone")}</span>
            {perSquareMetre && <span>{t("perSquareMetre", { count: perSquareMetre })}</span>}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          {plant.variety && <p className="text-sm text-muted-foreground">{plant.variety}</p>}

          {canEdit && (
            <>
              <Select
                value={plant.status}
                disabled={pending}
                onValueChange={(value) =>
                  run(() => updatePlantStatus(plant.id, value as PlantStatus))
                }
              >
                <SelectTrigger className="h-11" aria-label={t("title")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">{t("statusPlanned")}</SelectItem>
                  <SelectItem value="planted">{t("statusPlanted")}</SelectItem>
                  <SelectItem value="harvesting">{t("statusHarvesting")}</SelectItem>
                  <SelectItem value="removed">{t("statusRemoved")}</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="destructive"
                size="touch"
                className="self-start"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(t("deleteConfirm"))) return;
                  run(() => deletePlant(plant.id), true);
                }}
              >
                <Trash2 className="size-4" aria-hidden />
                {tc("delete")}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
