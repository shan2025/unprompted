// Shared by the chat server actions and the browser, so both enforce the same limits.

export const MAX_MESSAGE_LENGTH = 2000;

/** How long after sending a member can still change a message's text. */
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

/** The reactions offered on a message. Anything else is refused. */
export const REACTIONS = ["❤️", "😂", "😮", "😢", "👏", "🔥"] as const;

export type Reaction = (typeof REACTIONS)[number];

export function isReaction(value: unknown): value is Reaction {
  return typeof value === "string" && (REACTIONS as readonly string[]).includes(value);
}

export function canEdit(createdAt: Date, now = Date.now()) {
  return now - createdAt.getTime() < EDIT_WINDOW_MS;
}
