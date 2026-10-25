// Where the database lives: a local SQLite file by default, or a hosted
// libSQL database (Turso) on hosts without a persistent disk, like Vercel.
export function databaseConfig() {
  const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;
  if (url) return { url, authToken };
  if (process.env.VERCEL) {
    throw new Error(
      "No database configured. Set DATABASE_URL and DATABASE_AUTH_TOKEN to a Turso database (README → Deploying).",
    );
  }
  return { url: "file:./data/unprompted.db", authToken: undefined };
}
