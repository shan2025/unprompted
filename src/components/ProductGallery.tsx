"use client";

import { useState } from "react";
import { imageSources } from "@/lib/public-image-size";

export function ProductGallery({ files, title }: { files: string[]; title: string }) {
  const [selected, setSelected] = useState(0);
  return <div aria-label="Product photos">
    {/* eslint-disable-next-line @next/next/no-img-element -- responsive copies served by the uploads route */}
    <img {...imageSources(files[selected])} sizes="(min-width: 1024px) 700px, 100vw" alt={`${title}, photo ${selected + 1} of ${files.length}`}
      className="aspect-square w-full bg-paper object-contain sm:aspect-[16/10]" />
    {files.length > 1 && <div className="flex gap-2 overflow-x-auto p-2">
      {files.map((file, index) => <button type="button" key={file} aria-label={`Show photo ${index + 1}`} aria-pressed={index === selected}
        onClick={() => setSelected(index)} className={`size-16 shrink-0 border-2 p-0.5 ${index === selected ? "border-ink" : "border-transparent"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- responsive thumbnail */}
        <img {...imageSources(file)} sizes="64px" alt="" className="size-full object-cover" />
      </button>)}
    </div>}
  </div>;
}
