import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./src/lib/db/config";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl() },
});
