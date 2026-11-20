import { eq } from "drizzle-orm";
import { createSession, destroySession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { devAccountsEnabled } from "@/lib/dev-accounts";
import { safeNext } from "@/lib/format";

export async function POST(request: Request) {
  if (!(await devAccountsEnabled())) return new Response(null, { status: 404 });
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  if (origin !== `http://${host}` && origin !== `https://${host}`) {
    return new Response(null, { status: 403 });
  }
  const data = await request.formData();
  const id = Number(data.get("account"));
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) return new Response("Choose a test account.", { status: 400 });
  const [account] = await db.select({ id: schema.users.id, role: schema.users.role }).from(schema.users)
    .where(eq(schema.users.id, id));
  if (!account) return new Response("Test account unavailable.", { status: 404 });
  await destroySession();
  await createSession(account.id, true);
  return new Response(null, {
    status: 303,
    headers: { Location: safeNext(data.get("next"), account.role === "admin" ? "/marketplace" : "/explore"), "Cache-Control": "no-store" },
  });
}
