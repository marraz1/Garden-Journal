"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { searchCatalog, type CatalogOption } from "@/actions/plants";
import { deleteCatalogPlant } from "@/actions/plant-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FamilyDot } from "./family-select";
import { PlantFormDialog } from "./plant-form-dialog";
import type { PlantFamily } from "@/db/schema";

/**
 * The plant list on the plan screen. Picking a plant arms it; the next tap on
 * the canvas decides where it goes — into a bed, or onto bare ground.
 *
 * Tap-to-arm rather than drag-from-list: dragging out of a scrolling list onto
 * a scrolling canvas is fragile on a phone, and this way the whole flow is
 * keyboard reachable.
 */
export function PlantPalette({
  armed,
  onArm,
  canEdit,
}: {
  armed: CatalogOption | null;
  onArm: (option: CatalogOption | null) => void;
  canEdit: boolean;
}) {
  const t = useTranslations("plants");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  // Debounced catalog lookup; the list also loads once on mount.
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCatalog(query, locale)
        .then(setOptions)
        .catch(() => setOptions([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [query, locale]);

  function removeEntry(option: CatalogOption) {
    if (!window.confirm(t("deleteEntryConfirm"))) return;

    startTransition(async () => {
      const result = await deleteCatalogPlant(option.id);
      if (!result.ok) {
        toast.error(tErr(result.error as "generic"));
        return;
      }
      if (armed?.id === option.id) onArm(null);
      setOptions((current) => current.filter((entry) => entry.id !== option.id));
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t("list")}</h2>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t("createEntry")}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchCatalog")}
          aria-label={t("searchCatalog")}
          className="h-11 pl-9 text-base"
        />
      </div>

      <ul className="-mx-1 max-h-72 overflow-y-auto md:max-h-[28rem]">
        {options.map((option) => {
          const isArmed = armed?.id === option.id;
          return (
            <li key={option.id} className="flex items-center gap-1">
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => onArm(isArmed ? null : option)}
                aria-pressed={isArmed}
                className={`flex tap-target min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                  isArmed ? "bg-accent" : "hover:bg-accent/60"
                } disabled:opacity-60`}
              >
                <FamilyDot family={option.family as PlantFamily} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.95rem] font-medium">{option.name}</span>
                  {option.latinName && (
                    <span className="block truncate text-xs text-muted-foreground italic">
                      {option.latinName}
                    </span>
                  )}
                </span>
                {option.isCustom && (
                  <Badge variant="secondary" className="shrink-0">
                    {t("mine")}
                  </Badge>
                )}
              </button>

              {canEdit && option.isCustom && (
                <Button
                  variant="ghost"
                  size="icon-touch"
                  aria-label={`${tc("delete")}: ${option.name}`}
                  disabled={pending}
                  onClick={() => removeEntry(option)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <PlantFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(option) => {
          setOptions((current) => [option, ...current]);
          onArm(option);
        }}
      />
    </section>
  );
}
