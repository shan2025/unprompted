import "server-only";

// Sends email through Resend's API (https://resend.com). Without
// RESEND_API_KEY, emails are printed to the server log when running off
// Vercel, so password resets can be tested locally.

export async function sendEmail({ replyTo, ...message }: { to: string; subject: string; text: string; html: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Unprompters <onboarding@resend.dev>";

  if (!key) {
    if (!process.env.VERCEL) {
      console.log(`\n[email] to ${message.to}: ${message.subject}\n${message.text}\n`);
      return true;
    }
    console.error(`[email] RESEND_API_KEY is not set; "${message.subject}" was not sent.`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, ...message, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) {
      console.error(`[email] Resend rejected "${message.subject}": ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[email] Couldn't reach Resend for "${message.subject}":`, error);
    return false;
  }
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
