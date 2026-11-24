"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { dispatchShipment } from "@/lib/fulfillment";
import { isCompanyOwner } from "@/lib/merch";

export async function reviewShipment(fd: FormData) {
  const user = await getCurrentUser();
  if (!user || !isCompanyOwner(user)) return;
  const id = Number(fd.get("payment"));
  if (!Number.isSafeInteger(id) || id <= 0) return;
  const p = schema.payments;
  const [row] = await db.select({ status: p.fulfillment }).from(p).innerJoin(schema.listings, eq(schema.listings.id, p.listingId))
    .where(and(eq(p.id, id), eq(p.status, "paid"), eq(schema.listings.creatorId, user.id)));
  if (!row) return;
  const decision = fd.get("decision");
  if (row.status === "waiting" && decision === "send") {
    await dispatchShipment(id);
  } else if ((row.status === "review" || row.status === "submitting") && decision === "found" && fd.get("checked") === "on") {
    await db.update(p).set({ fulfillment: "sent", shipment: null }).where(and(eq(p.id, id), eq(p.fulfillment, row.status)));
  } else if ((row.status === "review" || row.status === "submitting") && decision === "missing" && fd.get("checked") === "on") {
    const stale = row.status === "submitting" ? sql`(${p.shipment}->>'claimedAt')::bigint < ${Date.now() - 10 * 60_000}` : undefined;
    const [reset] = await db.update(p).set({ fulfillment: "waiting" }).where(and(eq(p.id, id), eq(p.fulfillment, row.status), stale)).returning({ id: p.id });
    if (reset) await dispatchShipment(id);
  }
  revalidatePath("/admin/merch");
}
