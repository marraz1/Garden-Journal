"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { redeemInvite } from "@/actions/invites";
import { Button } from "@/components/ui/button";

export function JoinButton({ token }: { token: string }) {
  const t = useTranslations("members");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function join() {
    startTransition(async () => {
      const result = await redeemInvite(token);

      if (!result.ok) {
        // Invite-specific failures are keyed under members.*, the rest under errors.*.
        const key = result.error;
        toast.error(key.startsWith("invite") ? t(key as "inviteInvalid") : tErr(key as "generic"));
        return;
      }

      toast.success(result.data.alreadyMember ? t("alreadyMember") : t("joined"));
      router.push("/");
      router.refresh();
    });
  }

  return (
    <Button size="touch" className="min-w-56" onClick={join} disabled={pending}>
      {pending ? tc("loading") : t("join")}
    </Button>
  );
}
