"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { requestPasswordReset } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "./form-error";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await requestPasswordReset({ email }, locale);
      if (!result.ok) {
        setError(tErr(result.error as "generic"));
        return;
      }
      // Deliberately identical whether or not the address is registered.
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card p-6 text-center">
        <MailCheck className="size-8 text-primary" aria-hidden />
        <p className="font-medium">{t("resetSentTitle")}</p>
        <p className="text-sm text-balance text-muted-foreground">{t("resetSentBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FormError message={error} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoFocus
          className="h-11 text-base"
        />
      </div>

      <Button type="submit" size="touch" disabled={pending} className="mt-2 w-full">
        {pending ? "…" : t("sendResetLink")}
      </Button>
    </form>
  );
}
