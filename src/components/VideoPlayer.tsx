import { videoEmbed } from "@/lib/video";

export function VideoPlayer({ link, title }: { link: string; title: string }) {
  const video = videoEmbed(link);
  if (!video) return null;
  return (
    <figure className="card mt-6 overflow-hidden">
      <div className="aspect-video bg-ink">
        <iframe
          src={video.src}
          title={title}
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <figcaption className="px-4 py-2 text-xs text-muted">Plays from {video.provider}. AI scans don&apos;t cover video, so the score rests on the creator&apos;s disclosure and evidence.</figcaption>
    </figure>
  );
}
