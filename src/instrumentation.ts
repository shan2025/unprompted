import type { Instrumentation } from "next";

// Next calls this for every error the server catches: a page that fails to
// render, a route that throws, a form action that crashes. See report-error.ts.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("./lib/report-error");
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;
  await reportError({
    where: `${context.routeType} ${context.routePath}`,
    message: (error instanceof Error ? error.message : String(error)).slice(0, 500),
    // The path only: query strings can carry one-time tokens (password reset, email confirmation).
    path: request.path.split("?")[0].slice(0, 200),
    method: request.method,
    digest,
    stack: error instanceof Error ? error.stack?.slice(0, 3000) : undefined,
  });
};
