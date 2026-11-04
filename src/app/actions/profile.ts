"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export type ProfileState = { error?: string; saved?: boolean } | null;

export async function updateProfile(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Log in again." };

  const name = String(fd.get("name") ?? "").trim();
  const bio = String(fd.get("bio") ?? "").trim();
  if (name.length < 1 || name.length > 60) return { error: "Please enter a name of up to 60 characters." };
  if (bio.length > 500) return { error: "Keep your bio under 500 characters." };

  await db.update(schema.users).set({ name, bio }).where(eq(schema.users.id, user.id));
  revalidatePath("/", "layout");
  return { saved: true };
}
