import "server-only";
import { cookies } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { gardenMembers, gardens, type MemberRole } from "@/db/schema";
import { requireUser } from "@/lib/guards";

export const ACTIVE_GARDEN_COOKIE = "gj_active_garden";

export interface GardenSummary {
  id: string;
  name: string;
  location: string | null;
  role: MemberRole;
}

/** Every garden the signed-in user is a member of, owned ones first. */
export async function listGardensForUser(userId: string): Promise<GardenSummary[]> {
  return db
    .select({
      id: gardens.id,
      name: gardens.name,
      location: gardens.location,
      role: gardenMembers.role,
    })
    .from(gardenMembers)
    .innerJoin(gardens, eq(gardens.id, gardenMembers.gardenId))
    .where(eq(gardenMembers.userId, userId))
    .orderBy(asc(gardens.createdAt));
}

/**
 * The garden currently selected in the top-bar switcher. Falls back to the
 * first membership when the cookie is missing or points at a garden the user
 * no longer belongs to.
 */
export async function getActiveGarden(): Promise<GardenSummary | null> {
  const user = await requireUser();
  const cookieStore = await cookies();
  const preferredId = cookieStore.get(ACTIVE_GARDEN_COOKIE)?.value;

  if (preferredId) {
    const [match] = await db
      .select({
        id: gardens.id,
        name: gardens.name,
        location: gardens.location,
        role: gardenMembers.role,
      })
      .from(gardenMembers)
      .innerJoin(gardens, eq(gardens.id, gardenMembers.gardenId))
      .where(and(eq(gardenMembers.userId, user.id), eq(gardenMembers.gardenId, preferredId)))
      .limit(1);
    if (match) return match;
  }

  const [first] = await listGardensForUser(user.id);
  return first ?? null;
}
