"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Ruler, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createPlant, type CatalogOption } from "@/actions/plants";
import { Button } from "@/components/ui/button";
import { useQuickAddDialog } from "@/hooks/use-quick-add";
import { cellsToArea } from "@/lib/plan-geometry";
import { todayInAppZone } from "@/lib/dates";
import { PlantPalette } from "@/components/plants/plant-palette";
import { PlantSheet } from "@/components/plants/plant-sheet";
import { BedGrid } from "./bed-grid";
import { BedSheet } from "./bed-sheet";
import { BedFormDialog } from "./bed-form-dialog";
import { PlanSizeDialog } from "./plan-size-dialog";
import type { BedWithPlants, PlacedPlant } from "@/lib/queries/beds";

export function PlanEditor({
  gardenId,
  cols,
  rows,
  beds,
  plants,
  canEdit,
  canManage,
}: {
  gardenId: string;
  cols: number;
  rows: number;
  beds: BedWithPlants[];
  plants: PlacedPlant[];
  canEdit: boolean;
  canManage: boolean;
}) {
  const t = useTranslations("beds");
  const tGarden = useTranslations("garden");
  const tPlants = useTranslations("plants");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BedWithPlants | undefined>(undefined);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [armed, setArmed] = useState<CatalogOption | null>(null);
  const quickAdd = useQuickAddDialog(canEdit);

  // Derived rather than stored, so the open sheet always reflects the latest
  // server data after a refresh (plant added, status changed).
  const selected = selectedId ? (beds.find((bed) => bed.id === selectedId) ?? null) : null;
  const selectedPlant = selectedPlantId
    ? (plants.find((plant) => plant.id === selectedPlantId) ?? null)
    : null;

  // Escape is the expected way out of a "now tap where to plant" mode.
  useEffect(() => {
    if (!armed) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setArmed(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [armed]);

  function openForm(bed?: BedWithPlants) {
    setEditing(bed);
    quickAdd.setOpen(true);
  }

  function place(target: { bedId: string } | { gridX: number; gridY: number }) {
    if (!armed) return;
    const option = armed;

    startTransition(async () => {
      const result = await createPlant({
        gardenId,
        catalogId: option.id,
        plantedDate: todayInAppZone(),
        status: "planted",
        ...("bedId" in target
          ? { bedId: target.bedId }
          : { bedId: null, gridX: target.gridX, gridY: target.gridY }),
      });

      if (!result.ok) {
        toast.error(tErr(result.error as "generic"));
        return;
      }

      toast.success(tPlants("placed", { name: option.name }));
      setArmed(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {tGarden("planArea", { cols, rows, area: cellsToArea(cols, rows) })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <Button variant="outline" size="touch" onClick={() => setSizeOpen(true)}>
              <Ruler className="size-4" aria-hidden />
              {tGarden("gridSize")}
            </Button>
          )}
          {canEdit && (
            <Button size="touch" onClick={() => openForm()}>
              <Plus className="size-4" aria-hidden />
              {t("add")}
            </Button>
          )}
        </div>
      </div>

      {armed && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-primary/40 bg-primary/10 p-3">
          <p className="min-w-0 text-sm">
            <span className="font-medium">{armed.name}</span> — {tPlants("placeHint")}
          </p>
          <Button
            variant="ghost"
            size="icon-touch"
            aria-label={tPlants("placeCancel")}
            onClick={() => setArmed(null)}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_20rem] md:items-start">
        <div className="flex flex-col gap-3">
          {/* The grid renders even with nothing on it, so an empty plan can
              still be sized and looked at. */}
          <BedGrid
            cols={cols}
            rows={rows}
            beds={beds}
            plants={plants}
            canEdit={canEdit}
            placing={Boolean(armed)}
            onSelect={(bed) => setSelectedId(bed.id)}
            onSelectPlant={(plant) => setSelectedPlantId(plant.id)}
            onPlaceInBed={(bed) => place({ bedId: bed.id })}
            onPlaceAt={(gridX, gridY) => place({ gridX, gridY })}
          />

          {beds.length === 0 && plants.length === 0 && (
            <p className="text-center text-balance text-muted-foreground">{t("empty")}</p>
          )}
        </div>

        {canEdit && <PlantPalette armed={armed} onArm={setArmed} canEdit={canEdit} />}
      </div>

      <BedSheet
        bed={selected}
        gardenId={gardenId}
        canEdit={canEdit}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onEdit={(bed) => {
          setSelectedId(null);
          openForm(bed);
        }}
      />

      <PlantSheet
        plant={selectedPlant}
        canEdit={canEdit}
        onOpenChange={(open) => !open && setSelectedPlantId(null)}
      />

      <BedFormDialog
        key={editing?.id ?? "new"}
        gardenId={gardenId}
        bed={editing}
        open={quickAdd.open}
        onOpenChange={quickAdd.setOpen}
      />

      {canManage && (
        <PlanSizeDialog
          gardenId={gardenId}
          cols={cols}
          rows={rows}
          occupied={[...beds, ...plants]}
          open={sizeOpen}
          onOpenChange={setSizeOpen}
        />
      )}
    </div>
  );
}
