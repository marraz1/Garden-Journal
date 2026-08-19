import { Suspense } from "react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarCheck, Images, Leaf, Map, Sprout } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getActiveGarden } from "@/lib/gardens";
import { getDashboardData } from "@/lib/queries/dashboard";
import { TaskCheckbox } from "@/components/tasks/task-checkbox";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const garden = await getActiveGarden();
  if (!garden) return <EmptyState />;

  return (
    <section className="flex flex-col gap-4 py-2">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardGrid gardenId={garden.id} locale={locale} />
      </Suspense>
    </section>
  );
}

async function DashboardGrid({ gardenId, locale }: { gardenId: string; locale: string }) {
  const t = await getTranslations("dashboard");
  const tTasks = await getTranslations("tasks");
  const data = await getDashboardData(gardenId, locale);

  const dateFormatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const formatDay = (iso: string) => dateFormatter.format(new Date(`${iso}T12:00:00Z`));

  return (
    // Bento grid: the day's work gets the biggest tile, everything else is a glance.
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile className="col-span-2 sm:col-span-4" href="/tasks" icon={CalendarCheck}>
        <TileTitle>{t("todayTasks")}</TileTitle>

        {data.todayTasks.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{t("noTasksToday")}</p>
        ) : (
          <ul className="-mx-1 divide-y divide-border/70">
            {data.todayTasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3 px-1 py-2.5">
                <TaskCheckbox taskId={task.id} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.95rem] font-medium">{task.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[task.bedName, task.dueDate < data.today ? tTasks("overdue") : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Tile>

      <Tile href="/tasks" icon={CalendarCheck}>
        <TileTitle>{t("weekTasks")}</TileTitle>
        <TileNumber>{data.weekTaskCount}</TileNumber>
        {data.overdueCount > 0 && (
          <span className="text-xs font-medium text-destructive">
            {tTasks("overdue")}: {data.overdueCount}
          </span>
        )}
      </Tile>

      <Tile className="col-span-1 sm:col-span-2" href="/plan" icon={Leaf}>
        <TileTitle>{t("upcomingHarvest")}</TileTitle>
        {data.upcomingHarvests.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {data.upcomingHarvests.slice(0, 3).map((harvest) => (
              <li key={harvest.id} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{harvest.name}</span>
                <span className="shrink-0 text-xs font-semibold text-harvest">
                  {formatDay(harvest.date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Tile>

      <Tile href="/progress" icon={Images}>
        <TileTitle>{t("latestPhoto")}</TileTitle>
        {data.latestPhoto ? (
          <div className="relative mt-1 aspect-square overflow-hidden rounded-xl">
            <Image
              src={data.latestPhoto.url}
              alt={data.latestPhoto.note ?? ""}
              fill
              sizes="(max-width: 640px) 45vw, 200px"
              className="object-cover"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </Tile>

      <Tile className="col-span-2 sm:col-span-1" href="/plan" icon={Map}>
        <TileTitle>{t("gardenSummary")}</TileTitle>
        <p className="text-sm font-medium">{t("bedsCount", { count: data.counts.beds })}</p>
        <p className="text-sm text-muted-foreground">
          {t("plantsCount", { count: data.counts.plants })}
        </p>
      </Tile>
    </div>
  );
}

function Tile({
  href,
  icon: Icon,
  className,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-1.5 rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-primary/40 ${className ?? ""}`}
    >
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      {children}
    </Link>
  );
}

function TileTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

function TileNumber({ children }: { children: React.ReactNode }) {
  return <span className="text-3xl font-semibold tabular-nums">{children}</span>;
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Skeleton className="col-span-2 h-44 rounded-2xl sm:col-span-4" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl sm:col-span-2" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
}

async function EmptyState() {
  const t = await getTranslations("dashboard");

  return (
    <section className="mx-auto flex max-w-sm flex-col items-center gap-5 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-primary/12 text-primary">
        <Sprout className="size-8" aria-hidden />
      </span>
      <h1 className="text-xl font-semibold">{t("emptyTitle")}</h1>
      <p className="text-balance text-muted-foreground">{t("emptyBody")}</p>
      <Button asChild size="touch">
        <Link href="/gardens/new">{t("createGarden")}</Link>
      </Button>
    </section>
  );
}
