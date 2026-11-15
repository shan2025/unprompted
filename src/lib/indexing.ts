// Which posts we ask search engines to list. Very short posts with nothing to look
// at are still shown on the site, but kept out of search, so throwaway one-liners
// don't make the whole site look thin to Google.

/** Words of writing a post needs, when it has no photo or video, to be listed in search. */
export const MIN_INDEXED_WORDS = 50;

export function wordCount(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** A photo or video is enough on its own; otherwise the subtitle and writing together need MIN_INDEXED_WORDS. */
export function worthIndexing(post: { subtitle: string; body: string; coverFile: string | null; videoUrl: string | null }) {
  if (post.coverFile || post.videoUrl) return true;
  return wordCount(`${post.subtitle} ${post.body}`) >= MIN_INDEXED_WORDS;
}
