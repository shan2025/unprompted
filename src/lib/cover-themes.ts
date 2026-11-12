// Colour themes for generated covers. Work without an uploaded image gets a
// pattern cover (Cover.tsx); its creator can pick one of these themes, or leave
// it on "auto", which picks from the slug so it stays the same everywhere.

export const COVER_THEMES = [
  { id: "clay", label: "Clay", bg: "#e9dcc6", ink: "#3d2f1f", accent: "#b5441b" },
  { id: "sage", label: "Sage", bg: "#d8e0d1", ink: "#24352a", accent: "#4f7a3a" },
  { id: "slate", label: "Slate", bg: "#d9dde4", ink: "#1f2a3a", accent: "#3a6189" },
  { id: "rose", label: "Rose", bg: "#ecd5cc", ink: "#3b211b", accent: "#a33a2a" },
  { id: "ochre", label: "Ochre", bg: "#e6e0cf", ink: "#2d2a20", accent: "#8a6a17" },
  { id: "plum", label: "Plum", bg: "#dcd3e0", ink: "#2c2133", accent: "#6b4785" },
] as const;

export type CoverThemeId = (typeof COVER_THEMES)[number]["id"];

/** A theme id from form input, or null for "auto". */
export function parseCoverTheme(value: unknown): CoverThemeId | null {
  return COVER_THEMES.find((t) => t.id === value)?.id ?? null;
}

// Patterns for generated covers. By default a cover draws the pattern of its
// work's category; a creator can pick any of these instead. Ids are the
// pattern keys Cover.tsx draws.
export const COVER_PATTERNS = [
  { id: "writing", label: "Lines" },
  { id: "idea", label: "Note" },
  { id: "poetry", label: "Verse" },
  { id: "code", label: "Code" },
  { id: "website", label: "Browser" },
  { id: "music", label: "Waveform" },
  { id: "photography", label: "Rings" },
  { id: "design", label: "Shapes" },
  { id: "art", label: "Blobs" },
  { id: "crafts", label: "Grid" },
  { id: "film", label: "Film" },
  { id: "other", label: "Stripes" },
] as const;

export type CoverPatternId = (typeof COVER_PATTERNS)[number]["id"];

/** A pattern id from form input, or null to follow the category. */
export function parseCoverPattern(value: unknown): CoverPatternId | null {
  return COVER_PATTERNS.find((p) => p.id === value)?.id ?? null;
}
