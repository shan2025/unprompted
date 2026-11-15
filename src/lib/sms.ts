import "server-only";

// Sends login codes by text message through MSG91 (https://msg91.com), which
// handles India's DLT rules and also delivers abroad.
//
// Settings (see README → "Log in with a phone number"):
//   MSG91_AUTH_KEY     the account's auth key
//   MSG91_TEMPLATE_ID  an approved SMS template (Flow) that contains the code, like
//                      "##otp## is your Unprompters code. It expires in 10 minutes."
//   MSG91_CODE_VAR     the template's variable name, without the #s (default "otp")
//
// Without them, codes are printed to the server log when running off Vercel,
// so phone login can be tried locally, and phone numbers are refused on Vercel.

export function smsConfigured() {
  return Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID);
}

/** Whether the log-in box accepts phone numbers at all. */
export function phoneLoginEnabled() {
  return smsConfigured() || !process.env.VERCEL;
}

export async function sendSmsCode(phone: string, code: string) {
  if (!smsConfigured()) {
    if (!process.env.VERCEL) {
      console.log(`\n[sms] to ${phone}: ${code} is your Unprompters code\n`);
      return true;
    }
    console.error("[sms] MSG91_AUTH_KEY or MSG91_TEMPLATE_ID is not set; the code was not sent.");
    return false;
  }

  try {
    const res = await fetch("https://control.msg91.com/api/v5/flow", {
      method: "POST",
      headers: { authkey: process.env.MSG91_AUTH_KEY!, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        template_id: process.env.MSG91_TEMPLATE_ID,
        short_url: "0",
        recipients: [{ mobiles: phone.replace(/^\+/, ""), [process.env.MSG91_CODE_VAR ?? "otp"]: code }],
      }),
    });
    const body = await res.text();
    // MSG91 can answer 200 with {"type":"error"}, so check both.
    if (!res.ok || /"type"\s*:\s*"error"/.test(body)) {
      console.error(`[sms] MSG91 rejected the code message: ${res.status} ${body}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[sms] Couldn't reach MSG91:", error);
    return false;
  }
}
