"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { MAX_LINKS, normalizeLink } from "@/lib/links";
import { MAX_IMAGE_BYTES, UNREADABLE_IMAGE } from "@/lib/listing-form";
import { saveUpload } from "@/lib/uploads";

/** `photoSaved` says a new photo arrived with this save, so the form never claims one that didn't. */
export type ProfileState = { error?: string; saved?: boolean; photoSaved?: boolean } | null;

export async function updateProfile(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Log in again." };

  const name = String(fd.get("name") ?? "").trim();
  const bio = String(fd.get("bio") ?? "").trim();
  if (name.length < 1 || name.length > 60) return { error: "Please enter a name of up to 60 characters." };
  if (bio.length > 500) return { error: "Keep your bio under 500 characters." };

  const typed = fd.getAll("link").map((v) => String(v).trim()).filter(Boolean).slice(0, MAX_LINKS);
  const links: string[] = [];
  for (const raw of typed) {
    const link = normalizeLink(raw);
    if (!link) return { error: `"${raw.slice(0, 60)}" doesn't look like a web address. Try something like instagram.com/yourname.` };
    if (!links.includes(link)) links.push(link);
  }

  let avatarFile = fd.get("removeAvatar") === "on" ? null : user.avatarFile;
  const photo = fd.get("avatar");
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (hasPhoto) {
    if (photo.size > MAX_IMAGE_BYTES) return { error: "Photos must be 4 MB or smaller." };
    // saveUpload only keeps files it can read as images, and strips their metadata.
    avatarFile = await saveUpload(new Uint8Array(await photo.arrayBuffer()));
    if (!avatarFile) return { error: UNREADABLE_IMAGE };
  }

  await db.update(schema.users).set({ name, bio, avatarFile, links }).where(eq(schema.users.id, user.id));
  if (user.avatarFile && user.avatarFile !== avatarFile) {
    await db.delete(schema.uploads).where(eq(schema.uploads.name, user.avatarFile));
  }
  revalidatePath("/", "layout");
  return { saved: true, photoSaved: hasPhoto };
}
