import "./env.mts";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { and, eq, sql } from "drizzle-orm";
import { upgradeScore } from "../src/lib/scoring";
import { updateMetadataWording } from "../src/lib/analysis/media";
import { schema } from "../src/lib/db";
import { closeDb, db } from "../src/lib/db";

await migrate(db, { migrationsFolder: "./drizzle" });
for (const table of [schema.posts, schema.listings]) {
  const rows = await db.select({ id: table.id, analysis: table.analysis, evidence: table.evidence }).from(table)
    .where(sql`${table.analysis}->'score'->>'version' is distinct from '2'`);
  for (const row of rows) {
    const score = upgradeScore(row.analysis.score);
    await db.update(table).set({
      analysis: { ...row.analysis, score, media: updateMetadataWording(row.analysis.media) },
      evidence: row.evidence.filter((item) => item.kind !== "c2pa"),
      aiPercent: score.percent, aiLow: score.low, aiHigh: score.high, tier: score.tier,
      processVerified: false, evidenceReview: null,
    }).where(and(eq(table.id, row.id), eq(table.analysis, row.analysis)));
  }
}
await closeDb();
console.log("Database is up to date.");
