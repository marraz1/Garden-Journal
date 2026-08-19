import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getActiveGarden, listGardensForUser } from "@/lib/gardens";
import { AppShell } from "@/components/shell/app-shell";
import { localizedPath } from "@/i18n/paths";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect(localizedPath(locale, "/sign-in"));

  const [gardens, activeGarden] = await Promise.all([
    listGardensForUser(session.user.id),
    getActiveGarden(),
  ]);

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email, image: session.user.image }}
      gardens={gardens}
      activeGardenId={activeGarden?.id ?? null}
    >
      {children}
    </AppShell>
  );
}
