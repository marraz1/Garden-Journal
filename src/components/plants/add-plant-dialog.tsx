"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createPlant, searchCatalog, type CatalogOption } from "@/actions/plants";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FAMILY_COLOR_VAR } from "@/lib/plant-families";
import type { PlantFamily } from "@/db/schema";
import { todayInAppZone } from "@/lib/dates";

export function AddPlantDialog({
  gardenId,
  bedId,
  open,
  onOpenChange,
}: {
  gardenId: string;
  bedId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("plants");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [selected, setSelected] = useState<CatalogOption | null>(null);
  const [freeformName, setFreeformName] = useState("");
  const [variety, setVariety] = useState("");
  const [plantedDate, setPlantedDate] = useState(todayInAppZone());

  // Debounced catalog lookup — the list also loads once when the dialog opens.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      searchCatalog(query, locale)
        .then(setOptions)
        .catch(() => setOptions([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [query, locale, open]);

  function reset() {
    setQuery("");
    setSelected(null);
    setFreeformName("");
    setVariety("");
    setPlantedDate(todayInAppZone());
  }

  function submit(mode: "catalog" | "freeform") {
    const payload = {
      gardenId,
      bedId,
      catalogId: mode === "catalog" ? selected?.id : null,
      freeformName: mode === "freeform" ? freeformName : "",
      variety,
      plantedDate,
      status: "planted" as const,
    };

    startTransition(async () => {
      const result = await createPlant(payload);
      if (!result.ok) {
        toast.error(tErr(result.error));
        return;
      }
      reset();
      onOpenChange(false);
      router.refresh();
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
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("add")}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="catalog" className="flex min-h-0 flex-1 flex-col gap-4">
          <TabsList className="w-full">
            <TabsTrigger value="catalog" className="flex-1">
              {t("fromCatalog")}
            </TabsTrigger>
            <TabsTrigger value="freeform" className="flex-1">
              {t("freeform")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("searchCatalog")}
                className="h-11 pl-9 text-base"
                autoFocus
              />
            </div>

            <ul className="-mx-1 max-h-64 min-h-0 flex-1 overflow-y-auto">
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(option)}
                    aria-pressed={selected?.id === option.id}
                    className={`flex tap-target w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                      selected?.id === option.id ? "bg-accent" : "hover:bg-accent/60"
                    }`}
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor: FAMILY_COLOR_VAR[option.family as PlantFamily],
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.95rem] font-medium">
                        {option.name}
                      </span>
                      {option.latinName && (
                        <span className="block truncate text-xs text-muted-foreground italic">
                          {option.latinName}
                        </span>
                      )}
                    </span>
                    {option.daysToMaturity && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {option.daysToMaturity} d.
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {selected?.careNotes && (
              <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
                {selected.careNotes}
              </p>
            )}

            <PlantDetails
              variety={variety}
              setVariety={setVariety}
              plantedDate={plantedDate}
              setPlantedDate={setPlantedDate}
            />

            <DialogFooter>
              <Button
                size="touch"
                disabled={pending || !selected}
                onClick={() => submit("catalog")}
              >
                {pending ? tc("loading") : tc("add")}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="freeform" className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plant-name">{t("freeform")}</Label>
              <Input
                id="plant-name"
                value={freeformName}
                onChange={(event) => setFreeformName(event.target.value)}
                maxLength={80}
                className="h-11 text-base"
              />
            </div>

            <PlantDetails
              variety={variety}
              setVariety={setVariety}
              plantedDate={plantedDate}
              setPlantedDate={setPlantedDate}
            />

            <DialogFooter>
              <Button
                size="touch"
                disabled={pending || !freeformName.trim()}
                onClick={() => submit("freeform")}
              >
                {pending ? tc("loading") : tc("add")}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PlantDetails({
  variety,
  setVariety,
  plantedDate,
  setPlantedDate,
}: {
  variety: string;
  setVariety: (value: string) => void;
  plantedDate: string;
  setPlantedDate: (value: string) => void;
}) {
  const t = useTranslations("plants");
  const tc = useTranslations("common");

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="plant-variety">
          {t("variety")} ({tc("optional")})
        </Label>
        <Input
          id="plant-variety"
          value={variety}
          onChange={(event) => setVariety(event.target.value)}
          maxLength={80}
          className="h-11 text-base"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="plant-date">{t("plantedDate")}</Label>
        <Input
          id="plant-date"
          type="date"
          value={plantedDate}
          onChange={(event) => setPlantedDate(event.target.value)}
          className="h-11 text-base"
        />
      </div>
    </div>
  );
}
