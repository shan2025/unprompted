import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { siteUrl } from "./format";

// "Continue with Google" (OpenID Connect, authorization code flow with PKCE).
// Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to turn it on; without them the
// button doesn't appear. See README → "Log in with Google".

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

/** Holds the state, PKCE verifier and where to go after, between leaving for Google and coming back. */
export const GOOGLE_COOKIE = "unprompted_google";

export function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri() {
  return `${siteUrl()}/api/auth/google/callback`;
}

/** A fresh random state and PKCE pair, and the Google address to send the person to. */
export function googleStart() {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    // Lets people with several Google accounts pick the right one.
    prompt: "select_account",
  }).toString();
  return { state, verifier, url: url.toString() };
}

export interface GoogleProfile {
  email: string;
  name: string;
}

/**
 * Trades the code Google sent back for the person's profile. Returns null if
 * anything is off, including an email address Google hasn't verified: the email
 * is what matches them to an account here, so it has to really be theirs.
 */
export async function googleProfile(code: string, verifier: string): Promise<GoogleProfile | null> {
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) return null;
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return null;

  const infoRes = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${access_token}` }, cache: "no-store" });
  if (!infoRes.ok) return null;
  const info = (await infoRes.json()) as { email?: string; email_verified?: boolean | string; name?: string; given_name?: string };
  const verified = info.email_verified === true || info.email_verified === "true";
  if (!info.email || !verified) return null;

  const email = info.email.trim().toLowerCase();
  const name = (info.name || info.given_name || email.split("@")[0]).trim().slice(0, 60);
  return { email, name };
}
