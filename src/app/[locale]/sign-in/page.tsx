import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth, googleEnabled, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Link } from "@/i18n/navigation";
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
  // Only accept a relative path — an absolute URL here would be an open redirect.
  const target = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/";
  const t = await getTranslations("auth");

  return (
    <AuthShell
      title={t("signInTitle")}
      subtitle={t("signInSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/sign-up" className="font-medium text-primary hover:underline">
            {t("signUp")}
          </Link>
        </>
      }
    >
      <SignInForm callbackUrl={target} />

      {/* Only rendered when Google credentials are actually configured. */}
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground uppercase">{t("orContinueWith")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form
            action={async () => {
              "use server";
              // callbackUrl arrives locale-free from the proxy; re-prefix it so
              // an English viewer lands back on the English route.
              await signIn("google", { redirectTo: localizedPath(locale, target) });
            }}
          >
            <Button type="submit" variant="outline" size="touch" className="w-full">
              <GoogleIcon className="size-5" />
              {t("signInWithGoogle")}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
