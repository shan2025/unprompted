// The Postgres connection string. On Supabase, use the "Transaction pooler"
// URI from the project's Connect dialog; locally, any Postgres works.
export function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.VERCEL) {
    throw new Error("No database configured. Set DATABASE_URL to your Supabase connection string (README → Deploying).");
  }
  return "postgres://postgres:postgres@localhost:5432/unprompted";
}

/** True when the database is on this machine, which is the only place a destructive reseed is allowed. */
export function isLocalDatabase(url = databaseUrl()) {
  return /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(url);
}
