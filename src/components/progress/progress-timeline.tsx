"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { deleteProgressLog } from "@/actions/progress";
import { useQuickAddDialog } from "@/hooks/use-quick-add";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProgressEntry } from "@/lib/queries/progress";
import type { TaskTargets } from "@/lib/queries/tasks";
import { Lightbox } from "./lightbox";
import { ProgressFormDialog } from "./progress-form-dialog";

export function ProgressTimeline({
  gardenId,
  entries,
  targets,
  viewerId,
  canEdit,
}: {
  gardenId: string;
  entries: ProgressEntry[];
  targets: TaskTargets;
  viewerId: string;
  canEdit: boolean;
}) {
  const t = useTranslations("progress");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const quickAdd = useQuickAddDialog(canEdit);
  const [lightbox, setLightbox] = useState<{
    photos: { id: string; url: string }[];
    index: number;
  } | null>(null);

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteProgressLog(id);
      if (!result.ok) {
        toast.error(tErr(result.error));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {canEdit && (
          <Button size="touch" onClick={() => quickAdd.setOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t("add")}
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="py-10 text-center text-balance text-muted-foreground">{t("empty")}</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4"
            >
              <header className="flex items-center gap-3">
                <Avatar className="size-8">
                  {entry.authorImage && <AvatarImage src={entry.authorImage} alt="" />}
                  <AvatarFallback>
                    {(entry.authorName ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {t("by", { name: entry.authorName ?? "" })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dateFormatter.format(entry.occurredAt)}
                  </p>
                </div>

                {canEdit && entry.authorId === viewerId && (
                  <Button
                    variant="ghost"
                    size="icon-touch"
                    aria-label={tc("delete")}
                    onClick={() => remove(entry.id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                )}
              </header>

              {entry.photos.length > 0 && (
                <ul
                  className={`grid gap-1.5 ${
                    entry.photos.length === 1 ? "grid-cols-1" : "grid-cols-3"
                  }`}
                >
                  {entry.photos.map((photo, index) => (
                    <li key={photo.id}>
                      <button
                        type="button"
                        onClick={() => setLightbox({ photos: entry.photos, index })}
                        className={`relative block w-full overflow-hidden rounded-xl ${
                          entry.photos.length === 1 ? "aspect-4/3" : "aspect-square"
                        }`}
                      >
                        <Image
                          src={photo.url}
                          alt=""
                          fill
                          sizes={
                            entry.photos.length === 1 ? "(max-width: 640px) 100vw, 600px" : "33vw"
                          }
                          className="object-cover"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {entry.note && <p className="text-[0.95rem] whitespace-pre-wrap">{entry.note}</p>}

              <footer className="flex flex-wrap gap-2">
                {entry.bedName && <Badge variant="secondary">{entry.bedName}</Badge>}
                {entry.plantName && <Badge variant="secondary">{entry.plantName}</Badge>}
                {entry.metrics?.harvestKg != null && (
                  <Badge className="bg-harvest text-harvest-foreground">
                    {t("metricHarvestKg")}: {String(entry.metrics.harvestKg)}
                  </Badge>
                )}
                {entry.metrics?.heightCm != null && (
                  <Badge variant="secondary">
                    {t("metricHeightCm")}: {String(entry.metrics.heightCm)}
                  </Badge>
                )}
              </footer>
            </li>
          ))}
        </ol>
      )}

      <Lightbox
        photos={lightbox?.photos ?? []}
        index={lightbox?.index ?? null}
        onClose={() => setLightbox(null)}
      />

      <ProgressFormDialog
        gardenId={gardenId}
        targets={targets}
        open={quickAdd.open}
        onOpenChange={quickAdd.setOpen}
      />
    </div>
  );
}
