import "./env.mts";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDb, db } from "../src/lib/db";

await migrate(db, { migrationsFolder: "./drizzle" });
await closeDb();
console.log("Database is up to date.");
