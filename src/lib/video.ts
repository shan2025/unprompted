// Creators add video by pasting a YouTube or Vimeo link. Only the ID is kept, so
// the player address on our pages is always one we built, never one a user typed.

export const VIDEO_LINK_HELP = "Paste a YouTube or Vimeo link to the video.";

type Video = { provider: "youtube"; id: string } | { provider: "vimeo"; id: string; hash?: string };

const YOUTUBE_ID = /^[\w-]{11}$/;
const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"];
const VIMEO_ID = /^\d{5,12}$/;
const VIMEO_HASH = /^[0-9a-f]{6,20}$/i;

function parse(raw: string): Video | null {
  const text = raw.trim();
  if (!text || text.length > 300) return null;
  let url: URL;
  try {
    // People often paste "youtu.be/abc" with no https:// in front.
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;

  const host = url.hostname.toLowerCase();
  const path = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return path.length === 1 && YOUTUBE_ID.test(path[0]) ? { provider: "youtube", id: path[0] } : null;
  }
  if (YOUTUBE_HOSTS.includes(host)) {
    const id = path[0] === "watch" ? url.searchParams.get("v") : ["shorts", "embed", "live", "v"].includes(path[0]) ? path[1] : null;
    return id && YOUTUBE_ID.test(id) ? { provider: "youtube", id } : null;
  }

  if (host === "vimeo.com" || host === "www.vimeo.com") {
    if (!path[0] || !VIMEO_ID.test(path[0]) || path.length > 2) return null;
    if (path[1] && !VIMEO_HASH.test(path[1])) return null;
    return { provider: "vimeo", id: path[0], hash: path[1] };
  }
  if (host === "player.vimeo.com") {
    if (path[0] !== "video" || !path[1] || !VIMEO_ID.test(path[1])) return null;
    const hash = url.searchParams.get("h");
    return { provider: "vimeo", id: path[1], hash: hash && VIMEO_HASH.test(hash) ? hash : undefined };
  }
  return null;
}

/** A tidy link to store for a pasted YouTube or Vimeo address, or null if it isn't one. */
export function parseVideoLink(raw: string) {
  const video = parse(raw);
  if (!video) return null;
  if (video.provider === "youtube") return `https://www.youtube.com/watch?v=${video.id}`;
  return `https://vimeo.com/${video.id}${video.hash ? `/${video.hash}` : ""}`;
}

/** The player address, and a thumbnail where the provider offers a predictable one. */
export function videoEmbed(link: string) {
  const video = parse(link);
  if (!video) return null;
  if (video.provider === "youtube") {
    return {
      provider: "YouTube",
      src: `https://www.youtube-nocookie.com/embed/${video.id}`,
      thumbnail: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
    };
  }
  const query = new URLSearchParams({ dnt: "1" });
  if (video.hash) query.set("h", video.hash);
  return { provider: "Vimeo", src: `https://player.vimeo.com/video/${video.id}?${query}`, thumbnail: null };
}
