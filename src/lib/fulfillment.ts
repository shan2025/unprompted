import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { qikinkSession, submitShipment } from "./qikink";
import { reportError } from "./report-error";

export async function dispatchShipment(id: number) {
  const payments = schema.payments;
  const waiting = and(eq(payments.id, id), eq(payments.status, "paid"), eq(payments.fulfillment, "waiting"));
  const [row] = await db.select({ shipment: payments.shipment, cents: payments.amountCents }).from(payments).where(waiting);
  if (!row?.shipment) return;
  const session = await qikinkSession(row.shipment.mode).catch(async () => {
    await reportError({ where: "Qikink fulfillment", message: `Check the API configuration and resend UNP${id} from merch analytics.` });
    return null;
  });
  if (!session) return;
  const [claimed] = await db.update(payments).set({ fulfillment: "submitting", shipment: { ...row.shipment, claimedAt: Date.now() } })
    .where(waiting).returning({ id: payments.id });
  if (!claimed) return;
  try {
    await submitShipment(session, id, row.cents, row.shipment);
  } catch {
    // A timeout can mean the supplier accepted the order. Keep the reference and avoid a second print.
    await db.update(payments).set({ fulfillment: "review" }).where(and(eq(payments.id, id), eq(payments.fulfillment, "submitting")));
    return;
  }
  await db.update(payments).set({ fulfillment: "sent", shipment: null }).where(eq(payments.id, id));
}
