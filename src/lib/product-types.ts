import { categoryLabel, type CategoryId } from "./categories";

// The product describes what the buyer gets. Its craft still drives discovery and scoring.
export const PRODUCTS = [
  { id: "tshirt", label: "T-shirts & clothing", craft: "design", physical: true },
  { id: "cap", label: "Caps & hats", craft: "design", physical: true },
  { id: "accessory", label: "Bags & accessories", craft: "crafts", physical: true },
  { id: "print", label: "Prints & posters", craft: "art", physical: true },
  { id: "homeware", label: "Mugs & homeware", craft: "crafts", physical: true },
  { id: "merch", label: "Other merchandise", craft: "crafts", physical: true },
  { id: "crafts", label: "Handcrafted pieces", craft: "crafts", physical: false },
  { id: "code", label: "Software & code packages", craft: "code", physical: false },
  { id: "website", label: "Websites & themes", craft: "website", physical: false },
  { id: "writing", label: "Books & writing", craft: "writing", physical: false },
  { id: "poetry", label: "Poetry collections", craft: "poetry", physical: false },
  { id: "art", label: "Illustrations & artwork", craft: "art", physical: false },
  { id: "photography", label: "Photos & image collections", craft: "photography", physical: false },
  { id: "design", label: "Design assets & templates", craft: "design", physical: false },
  { id: "music", label: "Tracks & sample packs", craft: "music", physical: false },
  { id: "film", label: "Films & video assets", craft: "film", physical: false },
  { id: "idea", label: "Concepts & proposals", craft: "idea", physical: false },
  { id: "other", label: "Other creative products", craft: "other", physical: false },
] as const satisfies readonly { id: string; label: string; craft: CategoryId; physical: boolean }[];

export function productType(id: string | null | undefined) {
  return PRODUCTS.find(product => product.id === id);
}

export function productLabel(id: string | null, craft: string) {
  return productType(id)?.label ?? categoryLabel(craft);
}

export const MAX_PRODUCT_PHOTOS = 6;
