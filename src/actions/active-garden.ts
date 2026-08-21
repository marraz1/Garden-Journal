"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACTIVE_GARDEN_COOKIE } from "@/lib/gardens";
import { requireGardenAccess } from "@/lib/guards";

export async function setActiveGarden(gardenId: string) {
  // Membership check before we trust the id coming from the client.
  await requireGardenAccess(gardenId, "view");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_GARDEN_COOKIE, gardenId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
}
