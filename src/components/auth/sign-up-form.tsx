"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { signUpWithPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "./password-field";
import { FormError } from "./form-error";
import { PASSWORD_MIN_LENGTH } from "@/lib/passwords";

export function SignUpForm({ callbackUrl }: { callbackUrl: string }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await signUpWithPassword({ name, email, password });
      if (!result.ok) {
        setError(tErr(result.error as "generic"));
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FormError message={error} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">
          {t("name")} ({tc("optional")})
        </Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          autoFocus
          className="h-11 text-base"
        />
      </div>

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
          aria-invalid={Boolean(fieldErrors.email)}
          className="h-11 text-base"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t("password")}</Label>
        <PasswordField
          id="password"
          name="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">
          {t("passwordHint", { min: PASSWORD_MIN_LENGTH })}
        </p>
      </div>

      <Button type="submit" size="touch" disabled={pending} className="mt-2 w-full">
        {pending ? "…" : t("signUp")}
      </Button>
    </form>
  );
}
