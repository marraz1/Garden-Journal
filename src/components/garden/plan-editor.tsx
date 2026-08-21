"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuickAddDialog } from "@/hooks/use-quick-add";
import { BedGrid } from "./bed-grid";
import { BedSheet } from "./bed-sheet";
import { BedFormDialog } from "./bed-form-dialog";
import type { BedWithPlants } from "@/lib/queries/beds";

export function PlanEditor({
  gardenId,
  cols,
  rows,
  beds,
  canEdit,
}: {
  gardenId: string;
  cols: number;
  rows: number;
  beds: BedWithPlants[];
  canEdit: boolean;
}) {
  const t = useTranslations("beds");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BedWithPlants | undefined>(undefined);
  const quickAdd = useQuickAddDialog(canEdit);

  // Derived rather than stored, so the open sheet always reflects the latest
  // server data after a refresh (plant added, status changed).
  const selected = selectedId ? (beds.find((bed) => bed.id === selectedId) ?? null) : null;

  function openForm(bed?: BedWithPlants) {
    setEditing(bed);
    quickAdd.setOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {canEdit && (
          <Button size="touch" onClick={() => openForm()}>
            <Plus className="size-4" aria-hidden />
            {t("add")}
          </Button>
        )}
      </div>

      {beds.length === 0 ? (
        <p className="py-10 text-center text-balance text-muted-foreground">{t("empty")}</p>
      ) : (
        <BedGrid
          cols={cols}
          rows={rows}
          beds={beds}
          canEdit={canEdit}
          onSelect={(bed) => setSelectedId(bed.id)}
        />
      )}

      <BedSheet
        bed={selected}
        canEdit={canEdit}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onEdit={(bed) => {
          setSelectedId(null);
          openForm(bed);
        }}
      />

      <BedFormDialog
        key={editing?.id ?? "new"}
        gardenId={gardenId}
        bed={editing}
        open={quickAdd.open}
        onOpenChange={quickAdd.setOpen}
      />
    </div>
  );
}
