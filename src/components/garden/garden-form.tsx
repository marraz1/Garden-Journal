"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { createGarden, updateGarden } from "@/actions/gardens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_GRID, MIN_GRID, cellsToArea } from "@/lib/plan-geometry";

interface GardenFormProps {
  gardenId?: string;
  defaults?: {
    name: string;
    location: string | null;
    sizeM2: number | null;
    gridCols: number;
    gridRows: number;
  };
}

export function GardenForm({ gardenId, defaults }: GardenFormProps) {
  const t = useTranslations("garden");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  // Mirrored into state purely so the area readout follows what is typed.
  const [cols, setCols] = useState(defaults?.gridCols ?? 12);
  const [rows, setRows] = useState(defaults?.gridRows ?? 12);

  function onSubmit(formData: FormData) {
    const input = {
      name: String(formData.get("name") ?? ""),
      location: String(formData.get("location") ?? ""),
      sizeM2: formData.get("sizeM2") ? Number(formData.get("sizeM2")) : undefined,
      gridCols: Number(formData.get("gridCols") ?? 12),
      gridRows: Number(formData.get("gridRows") ?? 12),
    };

    startTransition(async () => {
      const result = gardenId ? await updateGarden(gardenId, input) : await createGarden(input);

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(tErr(result.error));
        return;
      }

      setFieldErrors({});
      toast.success(t("created"));
      router.push(gardenId ? "/settings" : "/");
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-5">
      <Field label={t("name")} error={fieldErrors.name && tErr("required")}>
        <Input
          name="name"
          required
          maxLength={80}
          defaultValue={defaults?.name}
          placeholder={t("namePlaceholder")}
          className="h-11 text-base"
          autoFocus={!gardenId}
        />
      </Field>

      <Field label={`${t("location")} (${tc("optional")})`}>
        <Input
          name="location"
          maxLength={120}
          defaultValue={defaults?.location ?? ""}
          className="h-11 text-base"
        />
      </Field>

      <Field label={`${t("sizeM2")} (${tc("optional")})`}>
        <Input
          name="sizeM2"
          type="number"
          inputMode="numeric"
          min={1}
          defaultValue={defaults?.sizeM2 ?? ""}
          className="h-11 text-base"
        />
        <p className="text-sm text-muted-foreground">{t("sizeM2Hint")}</p>
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">{t("gridSize")}</legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("gridCols")}>
            <Input
              name="gridCols"
              type="number"
              inputMode="numeric"
              min={MIN_GRID}
              max={MAX_GRID}
              defaultValue={defaults?.gridCols ?? 12}
              onChange={(event) => setCols(Number(event.target.value))}
              className="h-11 text-base"
            />
          </Field>
          <Field label={t("gridRows")}>
            <Input
              name="gridRows"
              type="number"
              inputMode="numeric"
              min={MIN_GRID}
              max={MAX_GRID}
              defaultValue={defaults?.gridRows ?? 12}
              onChange={(event) => setRows(Number(event.target.value))}
              className="h-11 text-base"
            />
          </Field>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("planScaleHint")}
          {Number.isFinite(cols) && Number.isFinite(rows) && cols > 0 && rows > 0 && (
            <> · {t("planArea", { cols, rows, area: cellsToArea(cols, rows) })}</>
          )}
        </p>
      </fieldset>

      <div className="flex gap-3 pt-2">
        <Button type="submit" size="touch" disabled={pending} className="flex-1">
          {pending ? tc("loading") : tc("save")}
        </Button>
        <Button type="button" size="touch" variant="ghost" onClick={() => router.back()}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | false;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
