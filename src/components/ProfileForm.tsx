"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { MAX_LINKS } from "@/lib/links";
import { Avatar } from "./Avatar";
import { shrinkImage } from "./FormParts";
import { keepFields } from "./keepFields";

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
  // Which photo change the save in flight is for: a new photo, a removal, or neither.
  const [photoSave, setPhotoSave] = useState<"new" | "remove" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  // The photo menu closes on a click elsewhere or on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const away = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [menuOpen]);
  // The form keeps its fields between saves, so once a photo is saved, empty the
  // file picker: a later Save changes shouldn't upload the same photo again.
  useEffect(() => {
    if (!state?.saved || !formRef.current) return;
    const photo = formRef.current.elements.namedItem("avatar");
    if (photo instanceof HTMLInputElement) photo.value = "";
  }, [state]);

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
      setPhotoSave("new");
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
    : pending && photoSave === "remove"
      ? "Removing your photo…"
      : pending && photoSave
        ? "Saving your photo…"
        : photoSave === "remove" && state?.saved
          ? "Photo removed."
          : photoSave && state?.saved && state.photoSaved
            ? "Photo saved."
            : photoSave && state?.saved
              ? "That photo didn't come through. Try choosing it again."
              : null;

  function pickPhoto() {
    setMenuOpen(false);
    fileRef.current?.click();
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        // Remove photo is a photo save; a press of Save changes is a full save.
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        if (submitter) setPhotoSave(submitter.getAttribute("name") === "removeAvatar" ? "remove" : null);
        setMenuOpen(false);
        keepFields(action)(e);
      }}
    >
      <div className="flex flex-wrap items-center gap-5 border-b border-line pb-6">
        {/* Like Instagram: the pencil on the photo opens a menu to change or remove it. */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={() => (avatarFile ? setMenuOpen((o) => !o) : pickPhoto())}
            aria-label={avatarFile ? "Edit profile photo" : "Add a profile photo"}
            aria-haspopup={avatarFile ? "menu" : undefined}
            aria-expanded={avatarFile ? menuOpen : undefined}
            className="group relative block rounded-full disabled:opacity-60"
          >
            {showPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local preview of the photo being saved
              <img src={preview} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <Avatar name={name} file={avatarFile} className="h-20 w-20 text-3xl" />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-ink text-white transition-transform group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </span>
          </button>
          {menuOpen && avatarFile && (
            <div role="menu" className="absolute left-0 top-full z-20 mt-2 w-52 overflow-hidden border border-line bg-white text-sm shadow-lg">
              <button type="button" role="menuitem" onClick={pickPhoto} className="block w-full px-4 py-3 text-left font-medium hover:bg-black/5">
                Upload a new photo
              </button>
              <button
                type="submit"
                role="menuitem"
                name="removeAvatar"
                value="on"
                className="block w-full border-t border-line px-4 py-3 text-left font-medium text-heavy hover:bg-black/5"
              >
                Remove photo
              </button>
            </div>
          )}
          <input
            ref={fileRef}
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            // Never disabled: a disabled field is left out of the form, photo and all.
            onChange={(e) => void choose(e.target)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="hint mt-0" role="status">
            {photoStatus ?? (avatarFile ? "Tap the pencil to change or remove your photo." : "Tap the pencil to add a photo. It saves as soon as you choose it.")}
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
