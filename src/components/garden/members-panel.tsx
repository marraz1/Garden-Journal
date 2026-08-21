"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Copy, Link2, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { changeMemberRole, leaveGarden, removeMember } from "@/actions/gardens";
import { createInvite, revokeInvite } from "@/actions/invites";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MemberRole } from "@/db/schema";
import type { MemberRow } from "@/lib/queries/members";

const INVITE_DAYS = 14;

interface InviteRow {
  id: string;
  token: string;
  role: MemberRole;
  expiresAt: Date;
  useCount: number;
  maxUses: number;
}

export function MembersPanel({
  gardenId,
  members,
  invites,
  viewerId,
  viewerRole,
  appUrl,
}: {
  gardenId: string;
  members: MemberRow[];
  invites: InviteRow[];
  viewerId: string;
  viewerRole: MemberRole;
  appUrl: string;
}) {
  const t = useTranslations("members");
  const tc = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const canManage = viewerRole === "owner";
  const roleLabel = (role: MemberRole) =>
    role === "owner" ? t("roleOwner") : role === "editor" ? t("roleEditor") : t("roleViewer");

  function run(action: () => Promise<{ ok: boolean; error?: string }>, successMessage?: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(tErr((result.error ?? "generic") as "generic"));
        return;
      }
      if (successMessage) toast.success(successMessage);
      router.refresh();
    });
  }

  async function copyLink(token: string) {
    const url = `${appUrl}/join/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      toast.success(tc("copied"));
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // Clipboard is blocked on insecure origins; show the link so it can be
      // selected by hand instead of failing silently.
      toast.info(url);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("title")}</h2>

        <ul className="flex flex-col gap-2">
          {members.map((member) => {
            const isSelf = member.userId === viewerId;
            return (
              <li
                key={member.userId}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3"
              >
                <Avatar className="size-10">
                  {member.image && <AvatarImage src={member.image} alt="" />}
                  <AvatarFallback>
                    {(member.name ?? member.email ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.name ?? member.email}</p>
                  {member.name && member.email && (
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  )}
                </div>

                {canManage && !isSelf && member.role !== "owner" ? (
                  <Select
                    value={member.role}
                    disabled={pending}
                    onValueChange={(value) =>
                      run(() =>
                        changeMemberRole(gardenId, member.userId, value as "editor" | "viewer"),
                      )
                    }
                  >
                    <SelectTrigger className="h-9 w-32" aria-label={t("changeRole")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">{t("roleEditor")}</SelectItem>
                      <SelectItem value="viewer">{t("roleViewer")}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">{roleLabel(member.role)}</Badge>
                )}

                {canManage && !isSelf && member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="icon-touch"
                    aria-label={t("removeMember")}
                    disabled={pending}
                    onClick={() => run(() => removeMember(gardenId, member.userId))}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        {viewerRole !== "owner" && (
          <Button
            variant="destructive"
            size="touch"
            className="self-start"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const result = await leaveGarden(gardenId);
                if (result.ok) router.push("/");
                return result;
              })
            }
          >
            {t("leaveGarden")}
          </Button>
        )}
      </section>

      {canManage && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("inviteLink")}</h2>
          <p className="text-sm text-muted-foreground">{t("linkHint", { days: INVITE_DAYS })}</p>

          <div className="flex flex-wrap gap-2">
            {(["editor", "viewer"] as const).map((role) => (
              <Button
                key={role}
                variant="outline"
                size="touch"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const result = await createInvite({ gardenId, role, days: INVITE_DAYS });
                    if (result.ok) await copyLink(result.data.token);
                    return result;
                  })
                }
              >
                <Link2 className="size-4" aria-hidden />
                {t("generateLink")} · {roleLabel(role)}
              </Button>
            ))}
          </div>

          {invites.length > 0 && (
            <ul className="flex flex-col gap-2">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-card p-3"
                >
                  <Badge variant="secondary">{roleLabel(invite.role)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {t("expiresAt", { date: invite.expiresAt.toLocaleDateString() })} ·{" "}
                    {t("usesLeft", { count: invite.maxUses - invite.useCount })}
                  </span>

                  <div className="ml-auto flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-touch"
                      aria-label={tc("copy")}
                      onClick={() => copyLink(invite.token)}
                    >
                      {copiedToken === invite.token ? (
                        <Check className="size-4" aria-hidden />
                      ) : (
                        <Copy className="size-4" aria-hidden />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-touch"
                      aria-label={t("revoke")}
                      disabled={pending}
                      onClick={() => run(() => revokeInvite(invite.id))}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
