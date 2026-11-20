const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim();

export const ga4MeasurementId = measurementId && /^G-[A-Z0-9]+$/.test(measurementId) ? measurementId : undefined;

const publicPages = new Set([
  "/", "/start", "/explore", "/marketplace", "/journal", "/about", "/standard",
  "/ai-writing-check", "/contact", "/terms", "/privacy", "/refunds",
]);

// Group public detail pages so creator handles and user-written slugs never go to Google.
export function analyticsPage(pathname: string): string | undefined {
  if (publicPages.has(pathname)) return pathname;
  if (/^\/explore\/[^/]+$/.test(pathname)) return "/explore/:category";
  if (/^\/marketplace\/[^/]+$/.test(pathname)) return "/marketplace/:category";
  if (pathname !== "/journal/new" && /^\/journal\/[^/]+$/.test(pathname)) return "/journal/:slug";
  if (/^\/listing\/[^/]+$/.test(pathname)) return "/listing/:slug";
  if (/^\/u\/[^/]+$/.test(pathname)) return "/u/:handle";
}
