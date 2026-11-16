// The seeded demo listings and Journal posts are for trying the site out
// locally. The live site (Vercel production) hides them, so visitors only see
// real people's work; everywhere else they show. HIDE_DEMO_CONTENT=true or
// =false overrides either way. Nothing is deleted.
export function hideDemo() {
  const setting = process.env.HIDE_DEMO_CONTENT;
  if (setting === "true") return true;
  if (setting === "false") return false;
  return process.env.VERCEL_ENV === "production";
}
