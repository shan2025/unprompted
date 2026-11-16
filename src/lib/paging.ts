// Long lists show one batch, then a "Show more" button that adds another.
// The count lives in the URL (?more=2), so a longer list survives a refresh
// and can be shared.

/** How many batches the URL asks for. One unless ?more= says otherwise; capped so a link can't ask for everything at once. */
export function batches(value: string | string[] | undefined, max = 20) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 1 ? Math.min(n, max) : 1;
}

/**
 * Splits what a search returned into what to show and whether more is waiting.
 * Ask the search for `show + 1` items: the extra one only proves there is more.
 */
export function firstBatches<T>(found: T[], show: number) {
  return { items: found.slice(0, show), more: found.length > show };
}
