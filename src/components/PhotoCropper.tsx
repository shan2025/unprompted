"use client";

import { useEffect, useRef, useState } from "react";

// What the saved photo is cropped to: a square, shown in a circle everywhere.
const OUTPUT = 800;
const MAX_ZOOM = 4;

type Size = { w: number; h: number };
type Offset = { x: number; y: number };

/**
 * Lets someone frame their photo before it's saved: drag to move it, and use
 * the slider (or the mouse wheel, or a pinch) to zoom. The circle shows what
 * others will see. `onDone` gets an 800px square JPEG.
 */
export function PhotoCropper({ src, onCancel, onDone }: { src: string; onCancel: () => void; onDone: (photo: Blob) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [box, setBox] = useState(300);
  const [natural, setNatural] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    const measure = () => setBox(boxRef.current?.clientWidth ?? 300);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // At zoom 1 the photo just covers the square; zooming scales from there.
  const base = natural ? Math.max(box / natural.w, box / natural.h) : 1;
  const scale = base * zoom;

  // Keep the photo covering the whole square, so the circle never shows a gap.
  function clamp(o: Offset, s = scale): Offset {
    if (!natural) return o;
    const minX = box - natural.w * s;
    const minY = box - natural.h * s;
    return { x: Math.min(0, Math.max(minX, o.x)), y: Math.min(0, Math.max(minY, o.y)) };
  }

  // Zooms around a point in the square (its centre by default), so what's under it stays put.
  function zoomTo(next: number, at: Offset = { x: box / 2, y: box / 2 }) {
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    const s = base * z;
    const ratio = s / scale;
    setZoom(z);
    setOffset(clamp({ x: at.x - (at.x - offset.x) * ratio, y: at.y - (at.y - offset.y) * ratio }, s));
  }

  function loaded() {
    const img = imgRef.current;
    if (!img) return;
    const size = { w: img.naturalWidth, h: img.naturalHeight };
    const s = Math.max(box / size.w, box / size.h);
    setNatural(size);
    setZoom(1);
    // Start centred.
    setOffset({ x: (box - size.w * s) / 2, y: (box - size.h * s) / 2 });
  }

  function down(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  }

  function move(e: React.PointerEvent) {
    const last = pointers.current.get(e.pointerId);
    if (!last) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      zoomTo(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.distance));
      return;
    }
    setOffset((o) => clamp({ x: o.x + e.clientX - last.x, y: o.y + e.clientY - last.y }));
  }

  function up(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  function wheel(e: React.WheelEvent) {
    const rect = boxRef.current!.getBoundingClientRect();
    zoomTo(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), { x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function nudge(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 30 : 10;
    const moves: Record<string, Offset> = { ArrowLeft: { x: step, y: 0 }, ArrowRight: { x: -step, y: 0 }, ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step } };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setOffset((o) => clamp({ x: o.x + m.x, y: o.y + m.y }));
  }

  function save() {
    const img = imgRef.current;
    if (!img || !natural) return;
    setSaving(true);
    const canvas = document.createElement("canvas");
    const side = Math.min(OUTPUT, Math.round(box / scale));
    canvas.width = canvas.height = Math.max(side, 1);
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    // The part of the original photo that sits inside the square.
    ctx.drawImage(img, -offset.x / scale, -offset.y / scale, box / scale, box / scale, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        setSaving(false);
        if (blob) onDone(blob);
        else setFailed(true);
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Crop your profile photo"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(92vw,420px)] bg-white p-5 backdrop:bg-black/70 sm:p-6"
    >
      <h2 className="text-xl font-normal">Adjust your photo</h2>
      <p className="mt-1 text-sm text-ink-soft">Drag to move it. Zoom to fill the circle. The circle is what people see.</p>

      <div
        ref={boxRef}
        tabIndex={0}
        role="application"
        aria-label="Photo position. Drag, or use the arrow keys to move it."
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={wheel}
        onKeyDown={nudge}
        className="relative mt-4 aspect-square w-full cursor-grab touch-none select-none overflow-hidden bg-field outline-none focus-visible:ring-2 focus-visible:ring-ink active:cursor-grabbing"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a local photo being framed, drawn to a canvas */}
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={loaded}
          onError={() => setFailed(true)}
          className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
          style={natural ? { width: natural.w, height: natural.h, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` } : { opacity: 0 }}
        />
        {/* Dims everything outside the circle. */}
        <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(255,255,255,0.65)] ring-2 ring-white" />
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm text-ink-soft">
        <span aria-hidden="true">−</span>
        <span className="sr-only">Zoom</span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => zoomTo(Number(e.target.value))}
          disabled={!natural}
          className="flex-1 accent-[var(--ink,#111)]"
        />
        <span aria-hidden="true">+</span>
      </label>

      {failed && (
        <p role="alert" className="mt-3 text-sm font-medium text-heavy">
          We couldn&apos;t read that photo. Try a JPG or PNG. iPhone photos in HEIC format may need converting first.
        </p>
      )}

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-ghost px-5 py-2">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={!natural || failed || saving} className="btn-primary px-5 py-2">
          {saving ? "Saving…" : "Save photo"}
        </button>
      </div>
    </dialog>
  );
}
