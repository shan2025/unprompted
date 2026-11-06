"use client";

import { useActionState, useEffect, useState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { Avatar } from "./Avatar";
import { shrinkImage } from "./FormParts";

// Profile photos show at most 80px wide, so 800px leaves room for sharp screens.
const AVATAR_EDGE = 800;

export function ProfileForm({ name, bio, avatarFile }: { name: string; bio: string; avatarFile: string | null }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  // Phone photos are often bigger than the host accepts in one request, which
  // used to fail with no message. Shrinking first means any photo fits.
  async function choose(input: HTMLInputElement) {
    const file = input.files?.[0];
    setProblem(null);
    setPreview(null);
    if (!file) return;
    setPreparing(true);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Choose a photo: a JPG, PNG, WebP or GIF.");
      const smaller = await shrinkImage(file, AVATAR_EDGE).catch(() => {
        throw new Error("We couldn't read that photo. Try a JPG or PNG. iPhone photos in HEIC format may need converting first.");
      });
      const files = new DataTransfer();
      files.items.add(smaller);
      input.files = files.files;
      setPreview(URL.createObjectURL(smaller));
    } catch (e) {
      input.value = "";
      setProblem((e as Error).message);
    } finally {
      setPreparing(false);
    }
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="avatar" className="label">
          Profile photo
        </label>
        <div className="flex items-center gap-4">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local preview of the photo being chosen
            <img src={preview} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
          ) : (
            <Avatar name={name} file={avatarFile} className="h-16 w-16 shrink-0 text-2xl" />
          )}
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            className="min-w-0 text-sm"
            onChange={(e) => void choose(e.target)}
          />
        </div>
        <p className="hint">Any photo from your phone or computer. We resize it for you.</p>
        {problem && (
          <p role="alert" className="mt-1.5 text-sm font-medium text-heavy">
            {problem}
          </p>
        )}
        {preview && <p className="mt-1.5 text-sm text-ink-soft">Looks good? Press Save changes to use it.</p>}
        {avatarFile && !preview && (
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
      <button className="btn-primary" disabled={pending || preparing}>
        {preparing ? "Preparing photo…" : pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
