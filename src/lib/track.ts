import "server-only";
import { after } from "next/server";
import { ga4RunsInThisEnvironment, ga4TracksVisitor } from "./analytics-audience";
import type { SessionUser } from "./auth";
import { posthogHost, posthogKey } from "./product-analytics";

/** The product events we record. Keep this list short: each one answers a question about how people use the site. */
export type ProductEvent =
  | "signed_up"
  | "post_published"
  | "listing_created"
  | "comment_added"
  | "work_appreciated"
  | "creator_followed"
  | "message_sent"
  | "creator_asked"
  | "checkout_started"
  | "order_paid"
  | "order_refund_due"
  | "account_deleted";

type Person = Pick<SessionUser, "id" | "email" | "role">;

/**
 * Records a product event against a person in PostHog, after the response is sent so it never slows a
 * page or fails an action. Same audience rules as the browser: production only, no admins or team accounts.
 */
export function track(
  person: Person,
  event: ProductEvent,
  properties: Record<string, string | number | boolean | null | undefined> = {},
  personProperties?: Record<string, string | boolean | null>,
) {
  if (!posthogKey || !ga4RunsInThisEnvironment() || !ga4TracksVisitor(person)) return;
  const apiKey = posthogKey;
  const body = JSON.stringify({
    api_key: apiKey,
    event,
    distinct_id: String(person.id),
    properties: { ...properties, $lib: "unprompters-server", ...(personProperties && { $set: personProperties }) },
    timestamp: new Date().toISOString(),
  });
  after(async () => {
    try {
      await fetch(`${posthogHost}/i/v0/e/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Analytics is best effort.
    }
  });
}
