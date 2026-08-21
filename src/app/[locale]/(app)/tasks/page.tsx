import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveGarden } from "@/lib/gardens";
import { requireGardenAccess } from "@/lib/guards";
import { listTasks, listTaskTargets } from "@/lib/queries/tasks";
import { can } from "@/lib/permissions";
import { todayInAppZone } from "@/lib/dates";
import { TasksView } from "@/components/tasks/tasks-view";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function TasksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const active = await getActiveGarden();
  if (!active) return <NoGarden />;

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <Tasks gardenId={active.id} locale={locale} />
    </Suspense>
  );
}

async function Tasks({ gardenId, locale }: { gardenId: string; locale: string }) {
  const { role } = await requireGardenAccess(gardenId, "view");
  const [tasks, targets] = await Promise.all([
    listTasks(gardenId),
    listTaskTargets(gardenId, locale),
  ]);

  return (
    <TasksView
      gardenId={gardenId}
      tasks={tasks}
      targets={targets}
      today={todayInAppZone()}
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
