import { getCurrentUser } from "@/lib/auth";
import { watchChat } from "@/lib/chat-events";

export const maxDuration = 60;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.verified) {
    return new Response(null, { status: user ? 403 : 401, headers: { "Cache-Control": "no-store" } });
  }

  const encoder = new TextEncoder();
  const change = encoder.encode("event: change\ndata: {}\n\n");
  const heartbeat = encoder.encode(": keep-alive\n\n");
  let cleanup: (() => void) | undefined;
  let pendingChange = false;

  function dispose() {
    const stop = cleanup;
    cleanup = undefined;
    stop?.();
  }

  function flushChange(controller: ReadableStreamDefaultController<Uint8Array>) {
    if (pendingChange && (controller.desiredSize ?? 0) > 0) {
      pendingChange = false;
      controller.enqueue(change);
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (request.signal.aborted) {
        controller.close();
        return;
      }

      function close() {
        if (!cleanup) return;
        dispose();
        controller.close();
      }
      const unwatch = watchChat(user.id, () => {
        pendingChange = true;
        flushChange(controller);
      }, (error) => {
        console.error("Chat event listener failed", error);
        close();
      });
      const keepAlive = setInterval(() => {
        if ((controller.desiredSize ?? 0) > 0) controller.enqueue(heartbeat);
      }, 15_000);
      // End cleanly before the function limit. EventSource reconnects automatically.
      const expiry = setTimeout(close, 50_000);
      cleanup = () => {
        request.signal.removeEventListener("abort", close);
        clearInterval(keepAlive);
        clearTimeout(expiry);
        unwatch();
      };
      request.signal.addEventListener("abort", close, { once: true });
      controller.enqueue(encoder.encode("retry: 2000\n\n"));
    },
    pull: flushChange,
    cancel: dispose,
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "private, no-store, no-transform",
      "Content-Type": "text/event-stream",
    },
  });
}
