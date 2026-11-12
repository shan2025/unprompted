"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { MAX_LINKS, normalizeLink } from "@/lib/links";
import { MAX_IMAGE_BYTES, UNREADABLE_IMAGE } from "@/lib/listing-form";
import { saveUpload } from "@/lib/uploads";
import { cleanHandle } from "@/lib/handle-rules";
import { handleProblem } from "@/lib/handles";

/** `photoSaved` says a new photo arrived with this save, so the form never claims one that didn't. */
export type ProfileState = { error?: string; saved?: boolean; photoSaved?: boolean } | null;

export async function updateProfile(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Log in again." };

  const name = String(fd.get("name") ?? "").trim();
  const bio = String(fd.get("bio") ?? "").trim();
  if (name.length < 1 || name.length > 60) return { error: "Please enter a name of up to 60 characters." };
  if (bio.length > 500) return { error: "Keep your bio under 500 characters." };

  const handle = cleanHandle(String(fd.get("handle") ?? user.handle));
  if (handle !== user.handle) {
    const problem = await handleProblem(handle, user.id);
    if (problem) return { error: problem };
  }

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

  try {
    await db.update(schema.users).set({ name, handle, bio, avatarFile, links }).where(eq(schema.users.id, user.id));
  } catch (e) {
    // Someone else took the handle between the check above and this save.
    if (handle !== user.handle && /unique|duplicate/i.test(String((e as Error)?.message ?? e)))
      return { error: "That profile link is taken. Try another." };
    throw e;
  }
  if (user.avatarFile && user.avatarFile !== avatarFile) {
    await db.delete(schema.uploads).where(eq(schema.uploads.name, user.avatarFile));
  }
  revalidatePath("/", "layout");
  return { saved: true, photoSaved: hasPhoto };
}

/** The switch for follower, comment and appreciation emails. Saves as soon as it's flipped. */
export async function setEmailNotifications(on: boolean): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await db.update(schema.users).set({ emailNotifications: on === true }).where(eq(schema.users.id, user.id));
  return { ok: true };
}

/** Live check for the profile link field: null when the handle is free for this person. */
export async function checkHandle(raw: string): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const handle = cleanHandle(raw);
  return handle === user.handle ? null : handleProblem(handle, user.id);
}
