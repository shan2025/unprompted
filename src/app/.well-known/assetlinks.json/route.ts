// Digital Asset Links: proves to Android that the Play Store app (a Trusted
// Web Activity) and this site belong to the same owner, so the app opens
// full-screen without a browser address bar.
//
// Set in the environment:
//   ANDROID_PACKAGE_NAME          e.g. com.unprompters.app
//   ANDROID_SHA256_FINGERPRINTS   comma-separated SHA-256 signing-cert fingerprints.
//                                 Include the Play App Signing key from Play Console
//                                 (Setup > App signing) and your upload key.

import { connection } from "next/server";

export async function GET() {
  // Read env at request time, not build time.
  await connection();

  const packageName = process.env.ANDROID_PACKAGE_NAME?.trim();
  const fingerprints = (process.env.ANDROID_SHA256_FINGERPRINTS ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);

  const body =
    packageName && fingerprints.length > 0
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: packageName,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]
      : [];

  return Response.json(body, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
