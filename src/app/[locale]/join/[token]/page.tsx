import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sprout } from "lucide-react";
import { auth, signIn } from "@/lib/auth";
import { getInvitePreview } from "@/lib/queries/invites";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";
import { JoinButton } from "@/components/garden/join-button";

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
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: `/join/${token}` });
          }}
        >
          <Button type="submit" size="touch" className="min-w-56">
            <GoogleIcon className="size-5" />
            {tAuth("signInWithGoogle")}
          </Button>
        </form>
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
