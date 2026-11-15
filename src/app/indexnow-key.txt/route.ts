import { INDEXNOW_KEY } from "@/lib/indexnow";

// IndexNow checks this file to confirm pings about this site really come from it (lib/indexnow.ts).
export function GET() {
  return new Response(INDEXNOW_KEY, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
