import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sprout } from "lucide-react";
import { auth } from "@/lib/auth";
import { getInvitePreview } from "@/lib/queries/invites";
import { Button } from "@/components/ui/button";
import { JoinButton } from "@/components/garden/join-button";
import { Link } from "@/i18n/navigation";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("members");
  const tErr = await getTranslations("errors");
  const tAuth = await getTranslations("auth");

  const invite = await getInvitePreview(token);
  const session = await auth();

  if (!invite || invite.status !== "valid") {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">{tErr("notFound")}</h1>
        <p className="text-muted-foreground">{invite ? t(invite.status) : t("inviteInvalid")}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold text-balance">
        {t("joinTitle", { garden: invite.gardenName })}
      </h1>
      <p className="text-balance text-muted-foreground">{t("joinBody", { role: invite.role })}</p>

      {session?.user ? (
        <JoinButton token={token} />
      ) : (
        // Not signed in: send them through the normal sign-in flow and back
        // here afterwards, so an invitee can also create an account first.
        <div className="flex w-full max-w-56 flex-col gap-2">
          <Button asChild size="touch">
            <Link href={{ pathname: "/sign-in", query: { callbackUrl: `/join/${token}` } }}>
              {tAuth("signIn")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="touch">
            <Link href={{ pathname: "/sign-up", query: { callbackUrl: `/join/${token}` } }}>
              {tAuth("signUp")}
            </Link>
          </Button>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-primary/12 text-primary">
        <Sprout className="size-8" aria-hidden />
      </span>
      {children}
    </main>
  );
}
