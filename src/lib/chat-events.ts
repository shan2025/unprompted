import "server-only";
import postgres from "postgres";
import { databaseUrl, isLocalDatabase } from "./db/config";

const subscribers = new Map<string, Set<() => void>>();
let connection: ReturnType<typeof connect> | undefined;
let idleTimer: ReturnType<typeof setTimeout> | undefined;

function connect() {
  // LISTEN needs a dedicated session. Keep normal queries on the transaction pooler.
  const url = new URL(databaseUrl());
  if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "6543") url.port = "5432";
  const sql = postgres(url.href, {
    ssl: isLocalDatabase(url.href) ? false : "require",
    max: 1,
    connect_timeout: 5,
    onnotice: () => {},
  });
  let wasListening = false;
  const ready = sql.listen("unprompted_chat", (userId) => {
    subscribers.get(userId)?.forEach((update) => update());
  }, () => {
    // Refresh after reconnecting to pick up changes made while the listener was down.
    if (wasListening) {
      for (const updates of subscribers.values()) updates.forEach((update) => update());
    }
    wasListening = true;
  }).catch((error: unknown) => {
    if (connection?.sql === sql) connection = undefined;
    void sql.end({ timeout: 0 });
    throw error;
  });
  return { sql, ready };
}

export function watchChat(userId: number, update: () => void, onError: (error: unknown) => void) {
  const current = connection ??= connect();
  clearTimeout(idleTimer);
  const key = String(userId);
  const updates = subscribers.get(key) ?? new Set<() => void>();
  updates.add(update);
  subscribers.set(key, updates);
  void current.ready.then(() => {
    if (updates.has(update)) update();
  }, (error: unknown) => {
    if (updates.has(update)) onError(error);
  });

  return () => {
    updates.delete(update);
    if (!updates.size) subscribers.delete(key);
    if (!subscribers.size) {
      idleTimer = setTimeout(() => {
        const idle = connection;
        connection = undefined;
        void idle?.sql.end({ timeout: 0 });
      }, 5000);
      idleTimer.unref();
    }
  };
}
