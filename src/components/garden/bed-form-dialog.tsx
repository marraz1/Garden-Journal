"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { createBed, updateBed } from "@/actions/beds";
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
import { FAMILY_COLOR_VAR, FAMILY_MESSAGE_KEY, PLANT_FAMILIES } from "@/lib/plant-families";
import type { PlantFamily } from "@/db/schema";
import type { BedWithPlants } from "@/lib/queries/beds";

type SunExposure = "full" | "partial" | "shade";

export function BedFormDialog({
  gardenId,
  bed,
  open,
  onOpenChange,
}: {
  gardenId: string;
  bed?: BedWithPlants;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("beds");
  const tc = useTranslations("common");
  const tPlants = useTranslations("plants");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(bed?.name ?? "");
  const [sun, setSun] = useState<SunExposure | "none">(bed?.sunExposure ?? "none");
  const [color, setColor] = useState<PlantFamily | "auto">(bed?.colorKey ?? "auto");
  const [soil, setSoil] = useState(bed?.soilType ?? "");
  const [notes, setNotes] = useState(bed?.notes ?? "");

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      name,
      // A new bed lands at the top-left; the user drags it where it belongs.
      gridX: bed?.gridX ?? 0,
      gridY: bed?.gridY ?? 0,
      gridW: bed?.gridW ?? 3,
      gridH: bed?.gridH ?? 2,
      colorKey: color === "auto" ? null : color,
      sunExposure: sun === "none" ? null : sun,
      soilType: soil,
      notes,
    };

    startTransition(async () => {
      const result = bed ? await updateBed(bed.id, payload) : await createBed(gardenId, payload);
      if (!result.ok) {
        toast.error(tErr(result.error));
        return;
      }
      onOpenChange(false);
      if (!bed) setName("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bed ? tc("edit") : t("add")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bed-name">{t("name")}</Label>
            <Input
              id="bed-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("namePlaceholder")}
              maxLength={60}
              required
              autoFocus
              className="h-11 text-base"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("sunExposure")}</Label>
            <Select value={sun} onValueChange={(value) => setSun(value as SunExposure | "none")}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{tc("none")}</SelectItem>
                <SelectItem value="full">{t("sunFull")}</SelectItem>
                <SelectItem value="partial">{t("sunPartial")}</SelectItem>
                <SelectItem value="shade">{t("sunShade")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("color")}</Label>
            <Select
              value={color}
              onValueChange={(value) => setColor(value as PlantFamily | "auto")}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* "auto" means the dominant plant family decides. */}
                <SelectItem value="auto">{tc("none")}</SelectItem>
                {PLANT_FAMILIES.map((family) => (
                  <SelectItem key={family} value={family}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: FAMILY_COLOR_VAR[family] }}
                      />
                      {tPlants(FAMILY_MESSAGE_KEY[family] as "familyOther")}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bed-soil">
              {t("soilType")} ({tc("optional")})
            </Label>
            <Input
              id="bed-soil"
              value={soil}
              onChange={(event) => setSoil(event.target.value)}
              maxLength={60}
              className="h-11 text-base"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bed-notes">
              {t("notes")} ({tc("optional")})
            </Label>
            <Textarea
              id="bed-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
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
