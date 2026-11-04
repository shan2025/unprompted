"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { Avatar } from "./Avatar";

export function ProfileForm({ name, bio, avatarFile }: { name: string; bio: string; avatarFile: string | null }) {
  const [state, action, pending] = useActionState(updateProfile, null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="avatar" className="label">
          Profile photo
        </label>
        <div className="flex items-center gap-4">
          <Avatar name={name} file={avatarFile} className="h-16 w-16 shrink-0 text-2xl" />
          <input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="min-w-0 text-sm" />
        </div>
        <p className="hint">A JPG, PNG, WebP or GIF, up to 4 MB.</p>
        {avatarFile && (
          <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" name="removeAvatar" /> Remove my photo
          </label>
        )}
      </div>
      <div>
        <label htmlFor="name" className="label">
          Name
        </label>
        <input id="name" name="name" className="field" defaultValue={name} maxLength={60} autoComplete="name" required />
      </div>
      <div>
        <label htmlFor="bio" className="label">
          Bio
        </label>
        <textarea id="bio" name="bio" rows={5} className="field" defaultValue={bio} maxLength={500} />
        <p className="hint">Shown on your public profile, posts and listings.</p>
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-accent-soft px-4 py-3 text-sm font-medium text-ink">
          {state.error}
        </p>
      )}
      {state?.saved && (
        <p role="status" className="text-sm font-medium text-human">
          Saved.
        </p>
      )}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
