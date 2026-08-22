"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createCatalogPlant } from "@/actions/plant-catalog";
import type { CatalogOption } from "@/actions/plants";
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
import { Textarea } from "@/components/ui/textarea";
import { FamilySelect } from "./family-select";
import type { PlantFamily } from "@/db/schema";

/**
 * Adds a plant the seeded catalog does not cover. The entry is the gardener's
 * own and stays in their picker for next season — unlike the free-text name on
 * a single planting, which carries no family, spacing or maturity.
 */
export function PlantFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (option: CatalogOption) => void;
}) {
  const t = useTranslations("plants");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [family, setFamily] = useState<PlantFamily>("other");
  const [latinName, setLatinName] = useState("");
  const [spacingCm, setSpacingCm] = useState("");
  const [daysToMaturity, setDaysToMaturity] = useState("");
  const [careNotes, setCareNotes] = useState("");

  function reset() {
    setName("");
    setFamily("other");
    setLatinName("");
    setSpacingCm("");
    setDaysToMaturity("");
    setCareNotes("");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createCatalogPlant({
        name,
        family,
        latinName,
        spacingCm: spacingCm || undefined,
        daysToMaturity: daysToMaturity || undefined,
        careNotes,
      });

      if (!result.ok) {
        toast.error(tErr(result.error as "generic"));
        return;
      }

      toast.success(t("entryCreated"));
      onCreated?.(result.data);
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createEntry")}</DialogTitle>
          <DialogDescription>{t("createEntryHint")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="catalog-name">{t("name")}</Label>
            <Input
              id="catalog-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
              autoFocus
              className="h-11 text-base"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="catalog-family">{t("family")}</Label>
            <FamilySelect id="catalog-family" value={family} onValueChange={setFamily} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="catalog-latin">
              {t("latinName")} ({tc("optional")})
            </Label>
            <Input
              id="catalog-latin"
              value={latinName}
              onChange={(event) => setLatinName(event.target.value)}
              maxLength={120}
              className="h-11 text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="catalog-spacing">
                {t("spacingCm")} ({tc("optional")})
              </Label>
              <Input
                id="catalog-spacing"
                type="number"
                inputMode="numeric"
                min={1}
                max={1000}
                value={spacingCm}
                onChange={(event) => setSpacingCm(event.target.value)}
                className="h-11 text-base"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="catalog-days">
                {t("daysToMaturityField")} ({tc("optional")})
              </Label>
              <Input
                id="catalog-days"
                type="number"
                inputMode="numeric"
                min={1}
                max={400}
                value={daysToMaturity}
                onChange={(event) => setDaysToMaturity(event.target.value)}
                className="h-11 text-base"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="catalog-care">
              {t("careNotes")} ({tc("optional")})
            </Label>
            <Textarea
              id="catalog-care"
              value={careNotes}
              onChange={(event) => setCareNotes(event.target.value)}
              maxLength={500}
              rows={3}
              className="text-base"
            />
          </div>

          <DialogFooter>
            <Button type="submit" size="touch" disabled={pending || !name.trim()}>
              {pending ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
