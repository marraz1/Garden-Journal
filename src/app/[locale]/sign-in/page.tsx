import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sprout } from "lucide-react";
import { auth, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";
import { localizedPath } from "@/i18n/paths";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session?.user) redirect(localizedPath(locale, "/"));

  const { callbackUrl } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-primary/12 text-primary">
          <Sprout className="size-8" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold text-balance">{t("signInTitle")}</h1>
        <p className="max-w-sm text-balance text-muted-foreground">{t("signInSubtitle")}</p>
      </div>

      <form
        action={async () => {
          "use server";
          // callbackUrl arrives locale-free from the proxy; re-prefix it so an
          // English viewer lands back on the English route.
          await signIn("google", { redirectTo: localizedPath(locale, callbackUrl || "/") });
        }}
      >
        <Button type="submit" size="touch" className="w-full min-w-64">
          <GoogleIcon className="size-5" />
          {t("signInWithGoogle")}
        </Button>
      </form>
    </main>
  );
}
