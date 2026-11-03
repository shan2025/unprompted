// Sellers take payment through their own links. "Pay" buttons on our pages carry
// our name, so they only go to known payment providers, not to any page that
// could ask a buyer for their card details.
const PROVIDERS = [
  "razorpay.me",
  "razorpay.com",
  "rzp.io",
  "paypal.me",
  "paypal.com",
  "buy.stripe.com",
  "instamojo.com",
  "imojo.in",
  "payu.in",
  "cashfree.com",
];

export const PAYMENT_LINK_HELP = "Use a Razorpay, PayPal, Stripe, Instamojo, PayU or Cashfree payment link, or a upi://pay link.";

function parse(raw: string) {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/** The link if it's safe to send buyers to, otherwise null. */
export function parsePaymentLink(raw: string) {
  const link = raw.trim();
  if (link.length > 500) return null;
  const url = parse(link);
  if (!url || url.username || url.password) return null;
  if (url.protocol === "upi:") return url.hostname === "pay" && url.searchParams.get("pa") ? link : null;
  if (url.protocol !== "https:") return null;
  return PROVIDERS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ? link : null;
}

/** The UPI ID in a upi:// link, shown so people on a computer can pay from their phone. */
export function upiId(link: string) {
  const url = parse(link);
  return url?.protocol === "upi:" ? url.searchParams.get("pa") : null;
}

/** Where a payment link goes, for the button. */
export function paymentProvider(link: string) {
  const url = parse(link);
  if (!url) return "the seller's payment page";
  return url.protocol === "upi:" ? "UPI" : url.hostname.replace(/^www\./, "");
}
