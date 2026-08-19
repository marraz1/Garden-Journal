"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createProgressLog } from "@/actions/progress";
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
import type { TaskTargets } from "@/lib/queries/tasks";
import { PhotoUploader, type UploadedPhoto } from "./photo-uploader";

export function ProgressFormDialog({
  gardenId,
  targets,
  open,
  onOpenChange,
}: {
  gardenId: string;
  targets: TaskTargets;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("progress");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayInAppZone());
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [bedId, setBedId] = useState("none");
  const [plantId, setPlantId] = useState("none");
  const [harvestKg, setHarvestKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [showMore, setShowMore] = useState(false);

  const plantOptions = targets.plants.filter((plant) => bedId === "none" || plant.bedId === bedId);
  const canSubmit = Boolean(note.trim()) || photos.length > 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const metrics: Record<string, number> = {};
    if (harvestKg) metrics.harvestKg = Number(harvestKg);
    if (heightCm) metrics.heightCm = Number(heightCm);

    startTransition(async () => {
      const result = await createProgressLog(gardenId, {
        note,
        occurredAt,
        bedId: bedId === "none" ? null : bedId,
        plantId: plantId === "none" ? null : plantId,
        metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
        photos,
      });

      if (!result.ok) {
        toast.error(tErr(result.error));
        return;
      }

      setNote("");
      setPhotos([]);
      setHarvestKg("");
      setHeightCm("");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("add")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <PhotoUploader gardenId={gardenId} onChange={setPhotos} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="progress-note">{t("note")}</Label>
            <Textarea
              id="progress-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("notePlaceholder")}
              maxLength={2000}
              rows={3}
              className="text-base"
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
                <Label htmlFor="progress-date">{tc("today")}</Label>
                <Input
                  id="progress-date"
                  type="date"
                  value={occurredAt}
                  onChange={(event) => setOccurredAt(event.target.value)}
                  className="h-11 text-base"
                />
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

              <fieldset className="grid grid-cols-2 gap-3">
                <legend className="mb-2 text-sm font-medium">{t("metrics")}</legend>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="metric-harvest">{t("metricHarvestKg")}</Label>
                  <Input
                    id="metric-harvest"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={0}
                    value={harvestKg}
                    onChange={(event) => setHarvestKg(event.target.value)}
                    className="h-11 text-base"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="metric-height">{t("metricHeightCm")}</Label>
                  <Input
                    id="metric-height"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={heightCm}
                    onChange={(event) => setHeightCm(event.target.value)}
                    className="h-11 text-base"
                  />
                </div>
              </fieldset>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" size="touch" disabled={pending || !canSubmit}>
              {pending ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
