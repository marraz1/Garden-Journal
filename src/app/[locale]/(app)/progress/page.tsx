import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveGarden } from "@/lib/gardens";
import { requireGardenAccess } from "@/lib/guards";
import { listProgress } from "@/lib/queries/progress";
import { listTaskTargets } from "@/lib/queries/tasks";
import { can } from "@/lib/permissions";
import { ProgressTimeline } from "@/components/progress/progress-timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function ProgressPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const active = await getActiveGarden();
  if (!active) return <NoGarden />;

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <Progress gardenId={active.id} locale={locale} />
    </Suspense>
  );
}

async function Progress({ gardenId, locale }: { gardenId: string; locale: string }) {
  const { user, role } = await requireGardenAccess(gardenId, "view");
  const [entries, targets] = await Promise.all([
    listProgress(gardenId, locale),
    listTaskTargets(gardenId, locale),
  ]);

  return (
    <ProgressTimeline
      gardenId={gardenId}
      entries={entries}
      targets={targets}
      viewerId={user.id}
      canEdit={can(role, "editContent")}
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
