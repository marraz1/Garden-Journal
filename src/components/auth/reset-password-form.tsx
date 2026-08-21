"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { resetPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordField } from "./password-field";
import { FormError } from "./form-error";
import { PASSWORD_MIN_LENGTH } from "@/lib/passwords";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await resetPassword({ token, password });
      if (!result.ok) {
        setError(tErr(result.error as "resetLinkInvalid"));
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/70 bg-card p-6 text-center">
        <CheckCircle2 className="size-8 text-primary" aria-hidden />
        <p className="text-balance">{t("resetDone")}</p>
        <Button size="touch" className="w-full" onClick={() => router.replace("/sign-in")}>
          {t("signIn")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FormError message={error} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <PasswordField
          id="password"
          name="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          {t("passwordHint", { min: PASSWORD_MIN_LENGTH })}
        </p>
      </div>

      <Button type="submit" size="touch" disabled={pending} className="mt-2 w-full">
        {pending ? "…" : t("resetSubmit")}
      </Button>

      <Link href="/sign-in" className="text-center text-sm text-muted-foreground hover:underline">
        {t("backToSignIn")}
      </Link>
    </form>
  );
}
