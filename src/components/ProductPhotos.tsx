"use client";

import { useCallback, useRef, useState } from "react";
import { draftFormData, type DraftPayload } from "@/lib/drafts";
import { MAX_PRODUCT_PHOTOS } from "@/lib/product-types";
import { MAX_FILES_BYTES, type EditableListing, type FieldErrors } from "@/lib/listing-form";
import { useDraftWorkspace } from "./DraftWorkspace";
import { FieldError } from "./FormParts";

type Photo = { id: string; file: File | null };

function initialPhotos(listing?: EditableListing, draft?: DraftPayload): Photo[] {
  const saved = [listing?.coverFile, ...(listing?.gallery ?? []).map(photo => photo.file)]
    .filter((id): id is string => Boolean(id)).map(id => ({ id, file: null }));
  if (!draft) return saved;
  const files = draftFormData({ fields: [], files: draft.files.filter(([key]) => key === "cover" || key === "gallery") });
  const slots = draft.fields.filter(([key]) => key === "photo_slot");
  if (!slots.length) {
    const cover = files.get("cover");
    if (cover instanceof File) return [{ id: "draft-cover", file: cover }, ...saved.slice(1)];
    return draft.fields.some(([key, value]) => key === "remove_cover" && value === "on") ? saved.slice(1) : saved;
  }
  const uploads = files.getAll("gallery");
  let index = 0;
  return slots.flatMap(([, slot]): Photo[] => {
    if (slot !== "upload") return saved.filter(photo => photo.id === slot);
    const file = uploads[index++];
    return file instanceof File ? [{ id: `draft-${index}`, file }] : [];
  });
}

function Thumbnail({ photo, position }: { photo: Photo; position: number }) {
  const preview = useCallback((image: HTMLImageElement | null) => {
    if (!image || !photo.file) return;
    const url = URL.createObjectURL(photo.file);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [photo.file]);
  const attach = useCallback((input: HTMLInputElement | null) => {
    if (!input || !photo.file) return;
    const transfer = new DataTransfer();
    transfer.items.add(photo.file);
    input.files = transfer.files;
  }, [photo.file]);
  return <>
    <input type="hidden" name="photo_slot" value={photo.file ? "upload" : photo.id} />
    {photo.file && <input hidden type="file" name="gallery" ref={attach} />}
    {/* eslint-disable-next-line @next/next/no-img-element -- local preview or the stored public copy */}
    <img ref={preview} src={photo.file ? undefined : `/api/files/${photo.id}`} alt={`Product photo ${position}`} className="aspect-square w-full bg-paper object-contain" draggable={false} />
  </>;
}

export function ProductPhotos({ listing, errors }: { listing?: EditableListing; errors: FieldErrors }) {
  const draft = useDraftWorkspace();
  const [photos, setPhotos] = useState(() => initialPhotos(listing, draft?.initial));
  const [problem, setProblem] = useState("");
  const [over, setOver] = useState<string | null>(null);
  const dragged = useRef<string | null>(null);
  const region = useRef<HTMLFieldSetElement>(null);
  function change(next: Photo[]) {
    setPhotos(next);
    setProblem("");
    draft?.changed();
  }
  function add(files: File[]) {
    if (!files.length) return;
    if (photos.length + files.length > MAX_PRODUCT_PHOTOS) return setProblem("Choose up to six photos in total.");
    if (files.some(file => !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type))) return setProblem("Choose JPG, PNG, WebP or GIF images.");
    const form = region.current?.form;
    const existingBytes = form ? [...new FormData(form).values()].reduce((total, v) => total + (v instanceof File ? v.size : 0), 0) : 0;
    if (existingBytes + files.reduce((total, file) => total + file.size, 0) > MAX_FILES_BYTES) return setProblem("These files exceed the 4 MB attachment limit. Choose smaller images.");
    change([...photos, ...files.map(file => ({ id: crypto.randomUUID(), file }))]);
  }
  function move(id: string | null, target: number) {
    const from = photos.findIndex(photo => photo.id === id);
    if (from < 0 || target < 0 || target >= photos.length || from === target) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    change(next);
  }
  function finish() { dragged.current = null; setOver(null); }
  function targetAt(x: number, y: number) {
    const tile = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-photo]");
    return tile && region.current?.contains(tile) ? tile.dataset.photo : undefined;
  }
  return (
    <fieldset className="min-w-0" data-product-photos ref={region} onDragOver={e => e.preventDefault()} onDrop={e => {
      e.preventDefault();
      if (e.dataTransfer.files.length) add(Array.from(e.dataTransfer.files));
      else {
        const target = targetAt(e.clientX, e.clientY);
        move(dragged.current, photos.findIndex(photo => photo.id === target));
      }
      finish();
    }}>
      <legend className="label">Product photos</legend>
      <p className="mb-3 text-sm text-ink-soft">The first photo is the cover. Drag a photo by its grip or use the arrows to change the order buyers see.</p>
      <input type="hidden" name="photo_slot" value="" />
      {photos.length > 0 && <ol aria-label="Photos in customer viewing order" className="mb-3 flex gap-3 overflow-x-auto pb-2">
        {photos.map((photo, index) => <li key={photo.id} data-photo={photo.id} draggable
          className={`w-32 shrink-0 border p-2 ${over === photo.id ? "border-ink bg-paper" : "border-line"}`}
          onDragStart={e => { dragged.current = photo.id; e.dataTransfer.setData("text/plain", photo.id); e.dataTransfer.effectAllowed = "move"; }}
          onDragEnter={() => { if (dragged.current) setOver(photo.id); }} onDragEnd={finish}>
          <Thumbnail photo={photo} position={index + 1} />
          <div className="mt-1 flex items-center justify-between gap-1">
            <span className="text-xs font-semibold">{index === 0 ? "1 · Cover" : `Photo ${index + 1}`}</span>
            <span aria-hidden="true" className="touch-none cursor-grab select-none px-2 py-1 text-lg" onPointerDown={e => {
              e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); dragged.current = photo.id;
            }} onPointerMove={e => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) setOver(targetAt(e.clientX, e.clientY) ?? null);
            }} onPointerUp={e => { move(dragged.current, photos.findIndex(p => p.id === targetAt(e.clientX, e.clientY))); finish(); }} onPointerCancel={finish}>⠿</span>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <button type="button" className="px-2 py-1 disabled:opacity-30" disabled={!index} aria-label={`Move photo ${index + 1} earlier`} onClick={() => move(photo.id, index - 1)}>←</button>
            <button type="button" className="px-2 py-1 disabled:opacity-30" disabled={index === photos.length - 1} aria-label={`Move photo ${index + 1} later`} onClick={() => move(photo.id, index + 1)}>→</button>
            <button type="button" className="link ml-auto text-xs" aria-label={`Remove photo ${index + 1}`} onClick={() => change(photos.filter(p => p !== photo))}>Remove</button>
          </div>
        </li>)}
      </ol>}
      {photos.length < MAX_PRODUCT_PHOTOS && <label className="block cursor-pointer border border-dashed border-line p-4 text-center text-sm focus-within:outline">
        <span className="link font-semibold">Choose photos</span> or drop them here
        <input id="cover" aria-label="Choose product photos" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={e => {
          add(Array.from(e.currentTarget.files ?? [])); e.currentTarget.value = "";
        }} />
      </label>}
      <p className="hint">Up to six photos. Photos and evidence files share a 4 MB limit.</p>
      {problem && <p role="alert" className="hint text-heavy">{problem}</p>}
      <FieldError errors={errors} name="gallery" /><FieldError errors={errors} name="cover" />
    </fieldset>
  );
}
