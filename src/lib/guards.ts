import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { gardenMembers, type MemberRole } from "@/db/schema";
import { auth } from "@/lib/auth";
import { can, type GardenAction } from "@/lib/permissions";

export class AuthError extends Error {
  constructor(message = "Not signed in") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/** Throws when there is no session. Every server action starts here. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError();
  return session.user as SessionUser;
}

/**
 * The single access-control choke point for garden-scoped data. Every page
 * loader and server action that touches a garden must call this — nothing else
 * enforces the "users only see their own gardens" requirement.
 */
export async function requireGardenAccess(
  gardenId: string,
  action: GardenAction = "view",
): Promise<{ user: SessionUser; role: MemberRole }> {
  const user = await requireUser();

  const [membership] = await db
    .select({ role: gardenMembers.role })
    .from(gardenMembers)
    .where(and(eq(gardenMembers.gardenId, gardenId), eq(gardenMembers.userId, user.id)))
    .limit(1);

  // Non-members get "not found" semantics: never leak that the garden exists.
  if (!membership) throw new ForbiddenError("Garden not found");
  if (!can(membership.role, action)) throw new ForbiddenError();

  return { user, role: membership.role };
}

/** Non-throwing variant, for conditionally rendering UI. */
export async function getGardenRole(gardenId: string): Promise<MemberRole | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [membership] = await db
    .select({ role: gardenMembers.role })
    .from(gardenMembers)
    .where(and(eq(gardenMembers.gardenId, gardenId), eq(gardenMembers.userId, session.user.id)))
    .limit(1);

  return membership?.role ?? null;
}
