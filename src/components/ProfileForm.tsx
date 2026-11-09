"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { updateProfile } from "@/app/actions/profile";
import { linkLabel, MAX_LINKS, normalizeLink, siteName } from "@/lib/links";
import { Avatar } from "./Avatar";
import { CopyLink } from "./CopyLink";
import { keepFields } from "./keepFields";
import { PhotoCropper } from "./PhotoCropper";
import { SiteIcon } from "./SiteIcon";

const NAME_MAX = 60;
const BIO_MAX = 500;

type Values = { name: string; bio: string; links: string[] };

/** Two sets of values are the same profile once trimmed and with links cleaned up the way the server saves them. */
function sameProfile(a: Values, b: Values) {
  const clean = (v: Values) =>
    JSON.stringify([v.name.trim(), v.bio.trim(), v.links.map((l) => normalizeLink(l) ?? l.trim()).filter(Boolean)]);
  return clean(a) === clean(b);
}

/** One row of the links list. The id keeps each input steady while rows are added and removed. */
type LinkRow = { id: number; value: string };

export function ProfileForm({
  name: savedName,
  handle,
  joined,
  profileUrl,
  bio: savedBio,
  links: savedLinks,
  avatarFile,
}: {
  name: string;
  handle: string;
  joined: string | null;
  profileUrl: string;
  bio: string;
  links: string[];
  avatarFile: string | null;
}) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // Which photo change the save in flight is for: a new photo, a removal, or neither.
  const [photoSave, setPhotoSave] = useState<"new" | "remove" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLDialogElement>(null);
  // The photo being framed in the cropper: a newly chosen file, or the saved one.
  const [crop, setCrop] = useState<{ src: string; local: boolean } | null>(null);

  // The fields, and the values last saved, so the form can say when something has changed.
  const nextId = useRef(0);
  const rows = (links: string[]) => (links.length ? links : [""]).map((value) => ({ id: nextId.current++, value }));
  const [name, setName] = useState(savedName);
  const [bio, setBio] = useState(savedBio);
  const [links, setLinks] = useState<LinkRow[]>(() => rows(savedLinks));
  const [base, setBase] = useState<Values>({ name: savedName, bio: savedBio, links: savedLinks });
  const submitted = useRef<Values | null>(null);
  const current: Values = { name, bio, links: links.map((l) => l.value) };
  const dirty = !sameProfile(current, base);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  // The form keeps its fields between saves, so once a photo is saved, empty the
  // file picker: a later Save changes shouldn't upload the same photo again.
  // Whatever was sent with a successful save becomes the new "saved" version.
  // Right after a save the bar says so plainly for a few seconds, so it can't be missed.
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (!state?.saved) return;
    if (submitted.current) setBase(submitted.current);
    const photo = formRef.current?.elements.namedItem("avatar");
    if (photo instanceof HTMLInputElement) photo.value = "";
    setJustSaved(true);
    const t = setTimeout(() => setJustSaved(false), 4000);
    return () => clearTimeout(t);
  }, [state]);
  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // A chosen photo opens the cropper first, so people can frame it in the circle.
  function choose(input: HTMLInputElement) {
    const file = input.files?.[0];
    setProblem(null);
    setPreview(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      input.value = "";
      setProblem("Choose a photo: a JPG, PNG, WebP or GIF.");
      return;
    }
    setCrop({ src: URL.createObjectURL(file), local: true });
  }

  function closeCrop() {
    if (crop?.local) URL.revokeObjectURL(crop.src);
    setCrop(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // The framed photo saves straight away, so nobody has to scroll to a button to
  // keep it. It's an 800px square at most: the host refuses requests over 4.5 MB.
  function cropped(photo: Blob) {
    if (crop?.local) URL.revokeObjectURL(crop.src);
    setCrop(null);
    const input = fileRef.current;
    if (!input) return;
    const files = new DataTransfer();
    files.items.add(new File([photo], "profile-photo.jpg", { type: "image/jpeg" }));
    input.files = files.files;
    setPreview(URL.createObjectURL(photo));
    setPhotoSave("new");
    formRef.current?.requestSubmit();
  }

  const busy = pending;
  // The local preview covers the moment between choosing and the save finishing.
  const showPreview = preview && busy;
  const photoStatus =
    pending && photoSave === "remove"
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

  // Saves the form as it stands, without the photo.
  function removePhoto() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    data.set("removeAvatar", "on");
    data.delete("avatar");
    setPhotoSave("remove");
    submitted.current = snapshot();
    startTransition(() => action(data));
  }

  function snapshot(): Values {
    return { name: name.trim(), bio: bio.trim(), links: links.map((l) => l.value.trim()).filter(Boolean) };
  }

  function discard() {
    setName(base.name);
    setBio(base.bio);
    setLinks(rows(base.links));
  }

  const filled = links.filter((l) => l.value.trim());
  const left = MAX_LINKS - links.length;
  const photo = showPreview ? (
    // eslint-disable-next-line @next/next/no-img-element -- a local preview of the photo being saved
    <img src={preview} alt="" className="h-full w-full rounded-full object-cover" />
  ) : (
    <Avatar name={name || savedName} file={avatarFile} className="h-full w-full text-3xl" />
  );

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        // A press of Save changes is a full save; a framed photo submits with no button.
        if ((e.nativeEvent as SubmitEvent).submitter) setPhotoSave(null);
        submitted.current = snapshot();
        keepFields(action)(e);
      }}
      className="mt-7 grid items-start gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="min-w-0">
        <Section title="Photo" hint="A square photo works best. You can frame it after choosing.">
          <div className="flex flex-wrap items-center gap-5">
            {avatarFile ? (
              <button
                type="button"
                onClick={() => viewerRef.current?.showModal()}
                aria-label="View your photo"
                className="block h-[88px] w-[88px] shrink-0 rounded-full"
              >
                {photo}
              </button>
            ) : (
              <span className="block h-[88px] w-[88px] shrink-0">{photo}</span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="btn-ghost px-4 py-2 text-xs">
                  {avatarFile ? "Change photo" : "Add a photo"}
                </button>
                {avatarFile && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setCrop({ src: `/api/files/${avatarFile}`, local: false })}
                      className="link text-sm font-medium text-ink-soft hover:text-ink"
                    >
                      Adjust crop
                    </button>
                    {/* Not a submit button: Enter in a field must never remove the photo. */}
                    <button type="button" onClick={removePhoto} disabled={busy} className="link text-sm font-medium text-heavy">
                      Remove
                    </button>
                  </>
                )}
              </div>
              <p className="hint mt-2" role="status">
                {photoStatus ?? "It saves as soon as you choose it."}
              </p>
              {problem && (
                <p role="alert" className="mt-1 text-sm font-medium text-heavy">
                  {problem}
                </p>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            // Never disabled: a disabled field is left out of the form, photo and all.
            onChange={(e) => choose(e.target)}
          />
          {crop && <PhotoCropper src={crop.src} onCancel={closeCrop} onDone={cropped} />}
          {avatarFile && (
            // The photo at full size. A native dialog handles Escape and keeps focus inside;
            // a click on the dark backdrop closes it too.
            <dialog
              ref={viewerRef}
              aria-label="Your profile photo"
              onClick={(e) => e.target === e.currentTarget && viewerRef.current?.close()}
              className="m-auto max-h-[90dvh] max-w-[min(90vw,640px)] bg-transparent p-0 backdrop:bg-black/80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- served from our own file route */}
              <img src={`/api/files/${avatarFile}`} alt={`${savedName}'s profile photo`} className="block max-h-[85dvh] w-auto rounded-lg object-contain" />
              <button
                type="button"
                onClick={() => viewerRef.current?.close()}
                className="mx-auto mt-3 block rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink hover:bg-white/85"
              >
                Close
              </button>
            </dialog>
          )}
        </Section>

        <Section title="About you" hint="Shown on your profile, your posts and your listings.">
          <div className="space-y-6">
            <div>
              <FieldTop htmlFor="name" label="Name" count={name.length} max={NAME_MAX} />
              <input
                id="name"
                name="name"
                className="field text-base"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={NAME_MAX}
                autoComplete="name"
                required
              />
            </div>
            <div>
              <p className="label">Your profile link</p>
              <div className="flex items-center gap-3 border border-line py-2 pl-4 pr-2">
                <span className="min-w-0 flex-1 break-all text-[15px] text-ink-soft">
                  {profileUrl.replace(/^https?:\/\//, "").replace(/[^/]+$/, "")}
                  <strong className="font-semibold text-ink">{handle}</strong>
                </span>
                <CopyLink url={profileUrl} className="btn-ghost shrink-0 px-4 py-2 text-xs" />
              </div>
            </div>
            <div>
              <FieldTop htmlFor="bio" label="Bio" count={bio.length} max={BIO_MAX} />
              <textarea
                id="bio"
                name="bio"
                rows={4}
                className="field min-h-28 resize-y text-base leading-relaxed"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={BIO_MAX}
                placeholder="A line or two about what you make"
              />
            </div>
          </div>
        </Section>

        <Section title="Links" hint={`Up to ${MAX_LINKS}. We show the site's name and icon, like Instagram or GitHub.`}>
          <ul className="space-y-2.5">
            {links.map((row, i) => {
              const url = normalizeLink(row.value);
              const site = url ? siteName(url) : null;
              return (
                <li key={row.id} className="flex items-stretch border-b border-transparent bg-field focus-within:border-ink">
                  <label
                    htmlFor={`link-${row.id}`}
                    className="flex w-12 shrink-0 items-center justify-center gap-2 border-r border-line text-[13px] font-semibold text-ink-soft sm:w-36 sm:justify-start sm:px-3.5"
                  >
                    <SiteIcon site={site} />
                    <span className="hidden truncate sm:inline">{site ?? (url ? "Website" : "Link")}</span>
                  </label>
                  <input
                    id={`link-${row.id}`}
                    name="link"
                    type="text"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-base text-ink placeholder:text-muted focus:outline-none"
                    value={row.value}
                    onChange={(e) => setLinks((all) => all.map((l) => (l.id === row.id ? { ...l, value: e.target.value } : l)))}
                    placeholder={i === 0 ? "instagram.com/yourname" : "yoursite.com"}
                    aria-label={`Link ${i + 1}`}
                    maxLength={300}
                  />
                  <button
                    type="button"
                    onClick={() => setLinks((all) => (all.length > 1 ? all.filter((l) => l.id !== row.id) : [{ id: nextId.current++, value: "" }]))}
                    aria-label={row.value ? `Remove ${url ? linkLabel(url) : "this link"}` : "Clear this link"}
                    className="grid w-12 shrink-0 place-items-center text-muted hover:text-heavy"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            disabled={left <= 0}
            onClick={() => {
              setLinks((all) => [...all, { id: nextId.current++, value: "" }]);
              // Focus the new row once it's on the page.
              requestAnimationFrame(() => {
                const inputs = formRef.current?.querySelectorAll<HTMLInputElement>('input[name="link"]');
                inputs?.[inputs.length - 1]?.focus();
              });
            }}
            className="mt-3 inline-flex items-center gap-2 py-2 text-sm font-semibold disabled:text-muted"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add a link
            <span className="font-normal text-muted">· {left > 0 ? `${left} left` : "that's the limit"}</span>
          </button>
        </Section>

        {/* Stays at the bottom of the screen while the form is longer than it. */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-ink bg-paper py-4">
          <p role="status" className="mr-auto flex items-center gap-2 text-sm">
            {state?.error && !pending ? (
              <span role="alert" className="font-medium text-heavy">
                {state.error}
              </span>
            ) : dirty ? (
              <span className="flex items-center gap-2 font-semibold text-assist">
                <span className="h-2 w-2 rounded-full bg-assist" aria-hidden />
                Unsaved changes
              </span>
            ) : justSaved && !photoSave && !pending ? (
              <span className="fade inline-flex items-center gap-2 rounded-full bg-human/10 px-3 py-1.5 font-semibold text-human">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                Your profile is saved
              </span>
            ) : (
              <span className="text-muted">All changes saved</span>
            )}
          </p>
          {dirty && !pending && (
            <button type="button" onClick={discard} className="link text-sm font-medium text-ink-soft hover:text-ink">
              Discard
            </button>
          )}
          <button
            className={`btn-primary grow transition-colors sm:grow-0 ${justSaved && !photoSave && !dirty && !pending ? "!border-human !bg-human !text-paper !opacity-100" : ""}`}
            disabled={busy || !dirty}
          >
            {pending && !photoSave ? "Saving…" : justSaved && !photoSave && !dirty ? "✓ Saved" : "Save changes"}
          </button>
        </div>
      </div>

      <aside aria-label="Preview of your profile" className="lg:sticky lg:top-6">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <span className="eyebrow">Preview</span>
          <span className="text-[13px] text-muted">How visitors see you</span>
        </div>
        <div className="card px-6 pb-6 pt-7">
          <div className="h-[72px] w-[72px]">{photo}</div>
          <p className="mt-4 break-words text-3xl font-light leading-tight tracking-[-0.02em]">{name.trim() || "Your name"}</p>
          <p className="mt-1.5 text-sm text-muted">
            @{handle}
            {joined && <> · Joined {joined}</>}
          </p>
          {bio.trim() ? (
            <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-soft">{bio.trim()}</p>
          ) : (
            <p className="mt-3 text-[15px] italic text-muted">No bio yet</p>
          )}
          {filled.some((l) => normalizeLink(l.value)) && (
            <ul className="mt-3.5 flex flex-wrap gap-2">
              {filled.map((l) => {
                const url = normalizeLink(l.value);
                if (!url) return null;
                return (
                  <li key={l.id} className="inline-flex items-center gap-1.5 rounded-full border border-line py-1 pl-2.5 pr-3 text-[13px] font-medium text-ink-soft">
                    <SiteIcon site={siteName(url)} className="h-3.5 w-3.5" />
                    {linkLabel(url)}
                  </li>
                );
              })}
            </ul>
          )}
          <span className="btn-primary pointer-events-none mt-5 w-full" aria-hidden>
            Follow
          </span>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">Changes show here as you type. Nobody else sees them until you save.</p>
      </aside>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="grid gap-x-8 gap-y-4 border-t border-line py-7 md:grid-cols-[180px_minmax(0,1fr)]">
      <div>
        <h2 className="text-[17px] font-semibold tracking-normal">{title}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{hint}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** A field's label, with how much of its limit is used. It turns amber near the end. */
function FieldTop({ htmlFor, label, count, max }: { htmlFor: string; label: string; count: number; max: number }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      <span className={`text-xs tabular-nums ${count > max * 0.9 ? "font-semibold text-assist" : "text-muted"}`}>
        {count} / {max}
      </span>
    </div>
  );
}
