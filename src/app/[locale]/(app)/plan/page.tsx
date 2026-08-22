import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveGarden } from "@/lib/gardens";
import { requireGardenAccess } from "@/lib/guards";
import { getGarden } from "@/lib/queries/members";
import { listBedsWithPlants, listPlacedPlants } from "@/lib/queries/beds";
import { can } from "@/lib/permissions";
import { PlanEditor } from "@/components/garden/plan-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function PlanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const active = await getActiveGarden();
  if (!active) return <NoGarden />;

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <Plan gardenId={active.id} locale={locale} />
    </Suspense>
  );
}

async function Plan({ gardenId, locale }: { gardenId: string; locale: string }) {
  const { role } = await requireGardenAccess(gardenId, "view");
  const [garden, beds, plants] = await Promise.all([
    getGarden(gardenId),
    listBedsWithPlants(gardenId, locale),
    listPlacedPlants(gardenId, locale),
  ]);
  if (!garden) return null;

  return (
    <PlanEditor
      gardenId={garden.id}
      cols={garden.gridCols}
      rows={garden.gridRows}
      beds={beds}
      plants={plants}
      canEdit={can(role, "editContent")}
      canManage={can(role, "manageGarden")}
    />
  );
}

async function NoGarden() {
  const t = await getTranslations("dashboard");
  return (
    <section className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-balance text-muted-foreground">{t("emptyBody")}</p>
      <Button asChild size="touch">
        <Link href="/gardens/new">{t("createGarden")}</Link>
      </Button>
    </section>
  );
}
