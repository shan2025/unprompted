// Phone numbers for logging in by text message, stored in E.164 form: "+" then 8 to 15 digits.

/** True when what someone typed in the log-in box looks like a phone number rather than an email. */
export function looksLikePhone(input: string) {
  const s = input.trim();
  return !s.includes("@") && /^\+?[\d\s().-]{6,}$/.test(s);
}

/** Country code assumed when someone types a number without one. India is home base. */
export const DEFAULT_COUNTRY_CODE = "91";

/**
 * Tidies a number as typed ("98765 43210", "+1 (415) 555-0100", "0091 98765 43210")
 * into E.164. Returns null when it can't be a real number.
 */
export function parsePhone(input: string, defaultCountry = DEFAULT_COUNTRY_CODE): string | null {
  const raw = input.trim();
  if (!raw || /[a-z]/i.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) {
    // Already international.
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else {
    // A national number: drop a trunk "0" and add the default country code.
    digits = defaultCountry + digits.replace(/^0+/, "");
  }
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
  // Indian mobile numbers are ten digits starting 6 to 9; catch the common typos.
  if (digits.startsWith("91") && !/^91[6-9]\d{9}$/.test(digits)) return null;
  return `+${digits}`;
}

/** "+919876543210" → "+91 98765 43210". Other countries are shown as stored, since grouping varies. */
export function formatPhone(e164: string) {
  const m = e164.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

/** Only the last few digits, for messages that shouldn't show the whole number. */
export function maskPhone(e164: string) {
  return `•••• ${e164.slice(-4)}`;
}
