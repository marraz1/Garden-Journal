import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { gardenMembers, gardens, users, type MemberRole } from "@/db/schema";

export interface MemberRow {
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: MemberRole;
}

export async function listMembers(gardenId: string): Promise<MemberRow[]> {
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: gardenMembers.role,
    })
    .from(gardenMembers)
    .innerJoin(users, eq(users.id, gardenMembers.userId))
    .where(eq(gardenMembers.gardenId, gardenId))
    .orderBy(asc(gardenMembers.joinedAt));
}

export async function getGarden(gardenId: string) {
  const [garden] = await db.select().from(gardens).where(eq(gardens.id, gardenId)).limit(1);
  return garden ?? null;
}
