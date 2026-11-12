// The currencies a listing can be priced in. Sellers pick one, and the price is
// shown in it as entered: no conversion, so it matches what their payment link charges.
// Kept apart from format.ts's server code so the sell form can use it too.

export const CURRENCIES = {
  INR: { label: "₹ INR", symbol: "₹", max: 1_000_000 },
  USD: { label: "$ USD", symbol: "$", max: 10_000 },
  EUR: { label: "€ EUR", symbol: "€", max: 10_000 },
  GBP: { label: "£ GBP", symbol: "£", max: 10_000 },
} as const;

export type Currency = keyof typeof CURRENCIES;

/** Listings made before currencies existed were priced in dollars. */
export const DEFAULT_CURRENCY: Currency = "USD";

/** What the sell form starts on: most sellers' payment links charge rupees. */
export const FORM_CURRENCY: Currency = "INR";

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && value in CURRENCIES;
}

export function currencyOf(value: unknown): Currency {
  return isCurrency(value) ? value : DEFAULT_CURRENCY;
}
