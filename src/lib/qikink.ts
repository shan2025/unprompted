import "server-only";
import { cashfreeMode } from "./cashfree";
import { isCompanyOwner } from "./merch";
import { productType } from "./product-types";

type Mode = "sandbox" | "production";
export type Shipment = {
  claimedAt?: number;
  mode: Mode;
  sku: string;
  label: string;
  address: { first_name: string; last_name: string; address1: string; city: string; province: string; zip: string; phone: string; email: string; country_code: "IN" };
};
type Listing = { slug: string; creatorId: number; productType: string | null; isDemo: boolean };

/**
 * The company's own physical products ship through Qikink. Without a mapped SKU
 * they can't be sold at all, or a buyer could pay without giving an address.
 */
export function shipsThroughQikink(listing: Listing) {
  return !listing.isDemo && isCompanyOwner({ id: listing.creatorId }) && Boolean(productType(listing.productType)?.physical);
}

export function fulfillmentVariants(listing: Listing): Map<string, string> {
  if (!shipsThroughQikink(listing)) return new Map();
  const catalog: unknown = JSON.parse(process.env.QIKINK_CATALOG?.trim() || "{}");
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) throw Error("Invalid QIKINK_CATALOG");
  if (!Object.hasOwn(catalog, listing.slug)) return new Map();
  const options = (catalog as Record<string, unknown>)[listing.slug];
  if (!options || typeof options !== "object" || Array.isArray(options) || !Object.keys(options).length) throw Error("Missing Qikink variants");
  const variants = new Map<string, string>();
  for (const [label, sku] of Object.entries(options)) {
    if (!label.trim() || typeof sku !== "string" || !sku.trim()) throw Error("Invalid Qikink variant");
    variants.set(label, sku.trim());
  }
  return variants;
}

function settings() {
  const mode = process.env.QIKINK_ENV?.trim();
  const client = process.env.QIKINK_CLIENT_ID?.trim();
  const secret = process.env.QIKINK_CLIENT_SECRET?.trim();
  if ((mode !== "sandbox" && mode !== "production") || cashfreeMode() !== mode || !client || !secret) return null;
  return { mode, client, secret, base: mode === "production" ? "https://api.qikink.com" : "https://sandbox.qikink.com" } as const;
}

export function prepareShipment(variants: Map<string, string>, fd: FormData, phone: string, accountEmail: string | null, currency: string): Shipment | string {
  const config = settings();
  if (!config || currency !== "INR") return "Shipping is unavailable for this item. Please try again later.";
  const field = (name: string) => String(fd.get(name) ?? "").trim();
  const label = field("variant");
  const sku = variants.get(label);
  if (!sku) return "Choose an available product option.";
  const address = {
    first_name: field("first_name"), last_name: field("last_name"), address1: field("address1"),
    city: field("city"), province: field("province"), zip: field("zip"), email: accountEmail || field("delivery_email"),
    phone: phone.replace(/^\+91/, ""), country_code: "IN" as const,
  };
  if (![address.first_name, address.last_name, address.address1, address.city, address.province].every(s => s.length > 0 && s.length <= 200)
    || !/^[1-9]\d{5}$/.test(address.zip) || !/^\+91[6-9]\d{9}$/.test(phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email) || address.email.length > 254) {
    return "Enter the recipient’s name, Indian delivery address, six-digit PIN, mobile number and email.";
  }
  return { sku, label, mode: config.mode, address };
}

export async function qikinkSession(mode: Mode) {
  const config = settings();
  if (!config || config.mode !== mode) throw Error("Qikink configuration unavailable");
  const response = await fetch(`${config.base}/api/token`, {
    method: "POST", body: new URLSearchParams({ ClientId: config.client, client_secret: config.secret }),
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw Error("Qikink authentication failed");
  const data = await response.json();
  if (typeof data?.Accesstoken !== "string" || !data.Accesstoken) throw Error("Qikink token unavailable");
  return { base: config.base, client: config.client, token: data.Accesstoken as string };
}

export async function submitShipment(session: Awaited<ReturnType<typeof qikinkSession>>, id: number, cents: number, shipment: Shipment) {
  const price = (cents / 100).toFixed(2);
  const response = await fetch(`${session.base}/api/order/create`, {
    method: "POST", headers: { "Content-Type": "application/json", ClientId: session.client, Accesstoken: session.token },
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ order_number: `UNP${id}`, qikink_shipping: "1", gateway: "Prepaid", total_order_value: price,
      line_items: [{ search_from_my_products: 1, sku: shipment.sku, quantity: "1", price }], shipping_address: shipment.address }),
  });
  if (!response.ok) throw Error("Qikink order requires review");
  const data = await response.json();
  if (!(Number(data?.order_id) > 0 || String(data?.status_code) === "200")) throw Error("Qikink order acceptance unconfirmed");
}
