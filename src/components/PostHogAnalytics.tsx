"use client";

import { usePathname } from "next/navigation";
import posthog, { type CaptureResult } from "posthog-js";
import { useEffect, useRef } from "react";
import { isAddress, isPrivatePage, scrubUrl } from "@/lib/product-analytics";

export type AnalyticsPerson = { id: number; handle: string; name: string; verified: boolean } | null;

function scrub(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  // Replay chunks recorded on a private page are dropped; recording is also paused there below.
  if (event.event === "$snapshot" && isPrivatePage(window.location.pathname)) return null;
  // Every address-like value ($current_url, $referrer, $session_entry_url and the rest), wherever it sits.
  for (const bag of [event.properties, event.$set, event.$set_once, event.properties?.$set, event.properties?.$set_once]) {
    if (!bag || typeof bag !== "object") continue;
    for (const key of Object.keys(bag)) if (isAddress(bag[key])) bag[key] = scrubUrl(bag[key]);
  }
  return event;
}

export function PostHogAnalytics({ apiKey, host, person }: { apiKey: string; host: string; person: AnalyticsPerson }) {
  const pathname = usePathname();

  useEffect(() => {
    if (posthog.__loaded) return;
    posthog.init(apiKey, {
      api_host: host,
      defaults: "2026-05-30",
      person_profiles: "identified_only",
      // We use no feature flags, and the flags call sends person properties without passing through before_send.
      advanced_disable_feature_flags: true,
      before_send: scrub,
      session_recording: { maskAllInputs: true },
    });
  }, [apiKey, host]);

  const personId = person?.id;
  const handle = person?.handle;
  const name = person?.name;
  const verified = person?.verified;
  useEffect(() => {
    if (personId === undefined) {
      // Logged out (or just logged out): forget the last person so the next visitor isn't merged into them.
      if (posthog.get_property("$user_state") === "identified") posthog.reset();
      return;
    }
    posthog.identify(String(personId), { handle, name, verified });
  }, [personId, handle, name, verified]);

  // Pause replays on private pages, and resume only a recording we paused (so project settings still decide).
  const pausedRecording = useRef(false);
  useEffect(() => {
    if (isPrivatePage(pathname)) {
      if (posthog.sessionRecordingStarted()) {
        posthog.stopSessionRecording();
        pausedRecording.current = true;
      }
    } else if (pausedRecording.current) {
      posthog.startSessionRecording();
      pausedRecording.current = false;
    }
  }, [pathname]);

  return null;
}
