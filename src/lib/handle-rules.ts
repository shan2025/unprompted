export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;

/** What people type into the profile link field, cleaned the way it's saved: "Shan.K" -> "shank". */
export function cleanHandle(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, HANDLE_MAX);
}
