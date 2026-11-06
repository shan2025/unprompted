"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { MAX_LINKS } from "@/lib/links";
import { Avatar } from "./Avatar";
import { shrinkImage } from "./FormParts";

// Profile photos show at most 80px wide, so 800px leaves room for sharp screens.
const AVATAR_EDGE = 800;

const LINK_EXAMPLES = ["instagram.com/yourname", "youtube.com/@yourname", "github.com/yourname", "yoursite.com", ""];

export function ProfileForm({
  name,
  bio,
  links,
  avatarFile,
}: {
  name: string;
  bio: string;
  links: string[];
  avatarFile: string | null;
}) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [photoSave, setPhotoSave] = useState(false);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  // A chosen photo saves straight away, so nobody has to scroll to a button to
  // keep it. Phone photos are shrunk first: the host refuses requests over
  // 4.5 MB, which used to make the save fail with no message.
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
      setPhotoSave(true);
      formRef.current?.requestSubmit();
    } catch (e) {
      input.value = "";
      setProblem((e as Error).message);
    } finally {
      setPreparing(false);
    }
  }

  const busy = preparing || pending;
  // The local preview covers the moment between choosing and the save finishing.
  const showPreview = preview && busy;
  const photoStatus = preparing
    ? "Preparing your photo…"
    : pending && photoSave
      ? "Saving your photo…"
      : photoSave && state?.saved && state.photoSaved
        ? "Photo saved."
        : photoSave && state?.saved
          ? "That photo didn't come through. Try choosing it again."
          : null;

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        // A press of Save changes is a full save, not a photo save.
        if ((e.nativeEvent as SubmitEvent).submitter) setPhotoSave(false);
      }}
    >
      <div className="flex flex-wrap items-center gap-5 border-b border-line pb-6">
        {showPreview ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local preview of the photo being saved
          <img src={preview} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" />
        ) : (
          <Avatar name={name} file={avatarFile} className="h-20 w-20 shrink-0 text-3xl" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label htmlFor="avatar" className={`btn-ghost cursor-pointer px-5 py-2 ${busy ? "pointer-events-none opacity-60" : ""}`}>
              {avatarFile ? "Change photo" : "Add a photo"}
            </label>
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/*"
              className="sr-only"
              // Never disabled: a disabled field is left out of the form, photo and all.
              onChange={(e) => void choose(e.target)}
            />
            {avatarFile && !busy && (
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" name="removeAvatar" /> Remove photo
              </label>
            )}
          </div>
          <p className="hint mt-2" role="status">
            {photoStatus ?? "Any photo from your phone or computer. It saves as soon as you choose it."}
          </p>
          {problem && (
            <p role="alert" className="mt-1.5 text-sm font-medium text-heavy">
              {problem}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-5 pt-6 md:grid-cols-2">
        <div className="space-y-5">
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
            <textarea id="bio" name="bio" rows={4} className="field" defaultValue={bio} maxLength={500} />
            <p className="hint">Shown on your public profile, posts and listings.</p>
          </div>
        </div>
        <fieldset>
          <legend className="label">Your other profiles</legend>
          <p className="hint mb-2 mt-0">Instagram, YouTube, GitHub, your own site: up to {MAX_LINKS} links.</p>
          <div className="space-y-2">
            {Array.from({ length: MAX_LINKS }, (_, i) => (
              <input
                key={i}
                name="link"
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="field py-2.5"
                defaultValue={links[i] ?? ""}
                placeholder={LINK_EXAMPLES[i]}
                aria-label={`Link ${i + 1}`}
                maxLength={300}
              />
            ))}
          </div>
        </fieldset>
      </div>

      {/* Stays at the bottom of the screen while the form is longer than it. */}
      <div className="sticky bottom-0 -mx-6 mt-6 flex flex-wrap items-center gap-4 border-t border-line bg-white px-6 py-4">
        <button className="btn-primary" disabled={busy}>
          {pending && !photoSave ? "Saving…" : "Save changes"}
        </button>
        {state?.error && (
          <p role="alert" className="text-sm font-medium text-heavy">
            {state.error}
          </p>
        )}
        {state?.saved && !photoSave && (
          <p role="status" className="text-sm font-medium text-human">
            Saved.
          </p>
        )}
      </div>
    </form>
  );
}
