import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { gardenInvites, gardens, type MemberRole } from "@/db/schema";

export interface InvitePreview {
  gardenName: string;
  role: MemberRole;
  status: "valid" | "inviteInvalid" | "inviteExpired" | "inviteUsedUp";
}

/** Public lookup for the join page — deliberately exposes only the name. */
export async function getInvitePreview(token: string): Promise<InvitePreview | null> {
  const [invite] = await db
    .select({
      gardenName: gardens.name,
      role: gardenInvites.role,
      expiresAt: gardenInvites.expiresAt,
      revokedAt: gardenInvites.revokedAt,
      useCount: gardenInvites.useCount,
      maxUses: gardenInvites.maxUses,
    })
    .from(gardenInvites)
    .innerJoin(gardens, eq(gardens.id, gardenInvites.gardenId))
    .where(eq(gardenInvites.token, token))
    .limit(1);

  if (!invite) return null;

  const status: InvitePreview["status"] = invite.revokedAt
    ? "inviteInvalid"
    : invite.expiresAt.getTime() < Date.now()
      ? "inviteExpired"
      : invite.useCount >= invite.maxUses
        ? "inviteUsedUp"
        : "valid";

  return { gardenName: invite.gardenName, role: invite.role, status };
}

export async function listInvites(gardenId: string) {
  return (
    db
      .select({
        id: gardenInvites.id,
        token: gardenInvites.token,
        role: gardenInvites.role,
        expiresAt: gardenInvites.expiresAt,
        useCount: gardenInvites.useCount,
        maxUses: gardenInvites.maxUses,
      })
      .from(gardenInvites)
      // Revoked links are gone from the UI; only live ones are listed.
      .where(and(eq(gardenInvites.gardenId, gardenId), isNull(gardenInvites.revokedAt)))
      .orderBy(desc(gardenInvites.createdAt))
      .limit(10)
  );
}
