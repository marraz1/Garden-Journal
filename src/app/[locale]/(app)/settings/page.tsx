import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { getActiveGarden } from "@/lib/gardens";
import { requireGardenAccess } from "@/lib/guards";
import { getGarden, listMembers } from "@/lib/queries/members";
import { listInvites } from "@/lib/queries/invites";
import { GardenForm } from "@/components/garden/garden-form";
import { MembersPanel } from "@/components/garden/members-panel";
import { DeleteGardenButton } from "@/components/garden/delete-garden-button";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

async function baseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("garden");
  const tDash = await getTranslations("dashboard");

  const active = await getActiveGarden();
  if (!active) {
    return (
      <section className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">{t("noGardens")}</p>
        <Button asChild size="touch">
          <Link href="/gardens/new">{tDash("createGarden")}</Link>
        </Button>
      </section>
    );
  }

  const { user, role } = await requireGardenAccess(active.id, "view");
  const [garden, members, invites] = await Promise.all([
    getGarden(active.id),
    listMembers(active.id),
    role === "owner" ? listInvites(active.id) : Promise.resolve([]),
  ]);

  if (!garden) return null;

  return (
    <section className="flex flex-col gap-8 py-2">
      <h1 className="text-2xl font-semibold">{t("settings")}</h1>

      {role === "owner" && (
        <>
          <div className="max-w-md">
            <GardenForm
              gardenId={garden.id}
              defaults={{
                name: garden.name,
                location: garden.location,
                sizeM2: garden.sizeM2,
                gridCols: garden.gridCols,
                gridRows: garden.gridRows,
              }}
            />
          </div>
          <Separator />
        </>
      )}

      <MembersPanel
        gardenId={garden.id}
        members={members}
        invites={invites}
        viewerId={user.id}
        viewerRole={role}
        appUrl={await baseUrl()}
      />

      {role === "owner" && (
        <>
          <Separator />
          <DeleteGardenButton gardenId={garden.id} />
        </>
      )}
    </section>
  );
}
