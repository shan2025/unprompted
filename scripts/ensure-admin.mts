// Makes sure a moderator account exists, using ADMIN_EMAIL and ADMIN_PASSWORD
// from the environment. Runs on every deploy and is safe to repeat: an
// existing account with that email is promoted, and its password is left alone.

import "./env.mts";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { closeDb, db, schema } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";

if (!email) {
  console.log("ADMIN_EMAIL not set; skipping moderator account.");
  await closeDb();
  process.exit(0);
}

const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);

if (existing) {
  if (existing.role !== "admin") {
    await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, existing.id));
    console.log(`Promoted ${email} to moderator.`);
  } else {
    console.log(`Moderator ${email} already exists.`);
  }
} else {
  if (password.length < 10) {
    console.error("ADMIN_PASSWORD must be at least 10 characters; moderator account not created.");
    process.exit(1);
  }
  const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.handle, "team")).limit(1);
  await db.insert(schema.users).values({
    email,
    name: "Unprompters Team",
    handle: taken ? `team_${randomBytes(2).toString("hex")}` : "team",
    role: "admin",
    bio: "Moderation account.",
    passwordHash: await hashPassword(password),
  });
  console.log(`Created moderator account ${email}.`);
}

await closeDb();
