"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Plus, Sprout } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { setActiveGarden } from "@/actions/active-garden";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GardenSummary } from "@/lib/gardens";

export function GardenSwitcher({
  gardens,
  activeGardenId,
}: {
  gardens: GardenSummary[];
  activeGardenId: string | null;
}) {
  const t = useTranslations("garden");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const active = gardens.find((g) => g.id === activeGardenId);

  function select(gardenId: string) {
    if (gardenId === activeGardenId) return;
    startTransition(async () => {
      await setActiveGarden(gardenId);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="touch"
          disabled={pending}
          aria-label={t("switchGarden")}
          className="max-w-[60vw] justify-start gap-2 px-2"
        >
          <Sprout className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="truncate font-semibold">{active?.name ?? t("noGardens")}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-56">
        {gardens.map((garden) => (
          <DropdownMenuItem key={garden.id} onSelect={() => select(garden.id)} className="gap-2">
            <Check
              className={garden.id === activeGardenId ? "size-4 opacity-100" : "size-4 opacity-0"}
              aria-hidden
            />
            <span className="truncate">{garden.name}</span>
          </DropdownMenuItem>
        ))}

        {gardens.length > 0 && <DropdownMenuSeparator />}

        <DropdownMenuItem onSelect={() => router.push("/gardens/new")} className="gap-2">
          <Plus className="size-4" aria-hidden />
          {t("create")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
