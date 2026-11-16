import "server-only";
import { createHash } from "node:crypto";
import { escapeHtml, sendEmail } from "./email";
import { siteUrl } from "./format";
import { withinLimit } from "./rate-limit";

// Tells us when something breaks for a visitor. Every error is written to the
// server log as one searchable line. If ERROR_EMAIL (or ADMIN_EMAIL) is set,
// the first time each error happens in an hour it is also emailed, ten a day
// at most, so a broken page can't flood the inbox.

export type ErrorReport = {
  /** Where it broke: a page render, a route, a form action, or the visitor's browser. */
  where: string;
  message: string;
  path?: string;
  method?: string;
  /** Next's short id for a server error; the same id is shown to the visitor on the error screen. */
  digest?: string;
  stack?: string;
};

export async function reportError(report: ErrorReport) {
  console.error(`[error] ${JSON.stringify(report)}`);

  const to = process.env.ERROR_EMAIL ?? process.env.ADMIN_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) return;

  try {
    const fingerprint = createHash("sha256").update(`${report.where}|${report.path ?? ""}|${report.message}`).digest("hex").slice(0, 16);
    if (!(await withinLimit(`error:${fingerprint}`, 1, 60 * 60))) return;
    if (!(await withinLimit("error:emails", 10, 24 * 60 * 60))) return;

    const lines = [
      `What: ${report.message}`,
      `Where: ${report.where}${report.method ? ` (${report.method})` : ""}`,
      report.path ? `Page: ${siteUrl()}${report.path}` : "",
      report.digest ? `Reference: ${report.digest}` : "",
      report.stack ? `\n${report.stack}` : "",
    ].filter(Boolean);
    await sendEmail({
      to,
      subject: `Unprompters error: ${report.message.replace(/\s+/g, " ").slice(0, 90)}`,
      text: `${lines.join("\n")}\n\nThe same error won't be emailed again for an hour. Every occurrence is in the server log.`,
      html:
        lines.map((l) => `<p style="white-space:pre-wrap;font-family:monospace;font-size:13px">${escapeHtml(l)}</p>`).join("") +
        `<p style="color:#777;font-size:12px">The same error won't be emailed again for an hour. Every occurrence is in the server log.</p>`,
    });
  } catch {
    // If the database or the mail service is what's broken, the log line above still stands.
  }
}
