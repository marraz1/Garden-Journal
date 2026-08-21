import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Sun } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireGardenAccess } from "@/lib/guards";
import { getBed } from "@/lib/queries/beds";
import { getBedDetail } from "@/lib/queries/bed-detail";
import { FAMILY_COLOR_VAR, FAMILY_MESSAGE_KEY } from "@/lib/plant-families";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TaskCheckbox } from "@/components/tasks/task-checkbox";
import { can } from "@/lib/permissions";

export default async function BedPage({
  params,
}: {
  params: Promise<{ locale: string; bedId: string }>;
}) {
  const { locale, bedId } = await params;
  setRequestLocale(locale);

  // Resolve the garden first so access is checked before any bed data loads.
  const bedRow = await getBed(bedId);
  if (!bedRow) notFound();
  const { role } = await requireGardenAccess(bedRow.gardenId, "view");

  const detail = await getBedDetail(bedId, locale);
  if (!detail) notFound();

  const t = await getTranslations("beds");
  const tPlants = await getTranslations("plants");
  const tTasks = await getTranslations("tasks");
  const tProgress = await getTranslations("progress");
  const tc = await getTranslations("common");

  const canEdit = can(role, "editContent");
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const formatDay = (iso: string) => dateFormatter.format(new Date(`${iso}T12:00:00Z`));

  const sunLabel =
    detail.bed.sunExposure === "full"
      ? t("sunFull")
      : detail.bed.sunExposure === "partial"
        ? t("sunPartial")
        : detail.bed.sunExposure === "shade"
          ? t("sunShade")
          : null;

  const statusLabel = {
    planned: tPlants("statusPlanned"),
    planted: tPlants("statusPlanted"),
    harvesting: tPlants("statusHarvesting"),
    removed: tPlants("statusRemoved"),
  } as const;

  return (
    <article className="flex flex-col gap-6 py-2">
      <header className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link href="/plan">
            <ArrowLeft className="size-4" aria-hidden />
            {tc("back")}
          </Link>
        </Button>

        <h1 className="text-2xl font-semibold">{detail.bed.name}</h1>

        <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            {detail.bed.gridW} × {detail.bed.gridH}
          </span>
          {sunLabel && (
            <span className="flex items-center gap-1">
              <Sun className="size-4" aria-hidden />
              {sunLabel}
            </span>
          )}
          {detail.bed.soilType && <span>{detail.bed.soilType}</span>}
        </p>

        {detail.bed.notes && <p className="text-sm">{detail.bed.notes}</p>}
      </header>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{tPlants("title")}</h2>

        {detail.plants.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tPlants("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {detail.plants.map((plant) => (
              <li
                key={plant.id}
                className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: FAMILY_COLOR_VAR[plant.family] }}
                  />
                  <span className="flex-1 font-medium">
                    {plant.name}
                    {plant.variety && (
                      <span className="font-normal text-muted-foreground"> · {plant.variety}</span>
                    )}
                  </span>
                  <Badge variant="secondary">{statusLabel[plant.status]}</Badge>
                </div>

                {plant.latinName && (
                  <p className="text-xs text-muted-foreground italic">{plant.latinName}</p>
                )}

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {plant.plantedDate && (
                    <Fact label={tPlants("plantedDate")} value={formatDay(plant.plantedDate)} />
                  )}
                  {plant.expectedHarvestDate && (
                    <Fact
                      label={tPlants("expectedHarvest")}
                      value={formatDay(plant.expectedHarvestDate)}
                      highlight
                    />
                  )}
                </dl>

                {/* Catalog facts already read as full sentences, so they render
                    as chips rather than label/value pairs. */}
                <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{tPlants(FAMILY_MESSAGE_KEY[plant.family] as "familyOther")}</span>
                  {plant.spacingCm && <span>{tPlants("spacing", { cm: plant.spacingCm })}</span>}
                  {plant.daysToMaturity && (
                    <span>{tPlants("daysToMaturity", { days: plant.daysToMaturity })}</span>
                  )}
                </p>

                {plant.careNotes && (
                  <p className="rounded-xl bg-muted/60 p-3 text-sm">{plant.careNotes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{tTasks("title")}</h2>

        {detail.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tTasks("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {detail.tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3"
              >
                <TaskCheckbox taskId={task.id} readOnly={!canEdit} />
                <span className="min-w-0 flex-1 truncate text-[0.95rem]">{task.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDay(task.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{tProgress("title")}</h2>

        {detail.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tProgress("empty")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {detail.entries.map((entry) => (
              <li
                key={entry.id}
                className="overflow-hidden rounded-2xl border border-border/70 bg-card"
              >
                {entry.photoUrl && (
                  <div className="relative aspect-square">
                    <Image
                      src={entry.photoUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 45vw, 220px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1 p-3">
                  <span className="text-xs text-muted-foreground">
                    {dateFormatter.format(entry.occurredAt)}
                  </span>
                  {entry.note && <p className="line-clamp-3 text-sm">{entry.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

function Fact({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="uppercase">{label}</dt>
      <dd className={highlight ? "font-semibold text-harvest" : "font-medium text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
