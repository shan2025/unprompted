import type { ContentKind } from "./text";

// Extension point for third-party detectors. The built-in heuristics are a
// transparent baseline; for production you will want at least one dedicated
// detector per medium (for example a text detector and an image detector).
// Each provider returns its own share and confidence. The scorer pools them,
// so adding a provider never removes the creator's disclosure floor.
//
// To add one: implement DetectionProvider, read its API key from the
// environment, and push it into `externalProviders` only when the key is set.

export interface ProviderResult {
  /** Share of the content that looks machine-made, 0-1. */
  share: number;
  /** How much to trust this result, 0-1. Be honest: vendor accuracy claims rarely hold up. */
  confidence: number;
}

export interface DetectionProvider {
  id: string;
  label: string;
  analyzeText?(text: string, kind: ContentKind): Promise<ProviderResult | null>;
  analyzeImage?(bytes: Uint8Array): Promise<ProviderResult | null>;
}

export const externalProviders: DetectionProvider[] = [];
