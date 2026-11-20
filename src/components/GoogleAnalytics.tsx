"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";
import { analyticsPage } from "@/lib/analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

function gtag(command: string, target: string | Date | object, parameters?: object): void;
function gtag() {
  // Use the arguments object from Google's tag snippet for dataLayer commands.
  // eslint-disable-next-line prefer-rest-params
  (window.dataLayer ??= []).push(arguments);
}

export function GoogleAnalytics({ measurementId, enabled }: { measurementId: string; enabled: boolean }) {
  const pathname = usePathname();
  const page = enabled ? analyticsPage(pathname) : undefined;
  const previousView = useRef<{ pathname: string; location: string } | null>(null);
  const configured = useRef(false);

  useEffect(() => {
    window[`ga-disable-${measurementId}`] = !page;
    if (!page) {
      previousView.current = null;
      return;
    }
    if (previousView.current?.pathname === pathname) return;

    const location = window.location.origin + page;
    const referrer = document.referrer ? new URL(document.referrer).origin : "";
    const details = {
      page_location: location,
      page_referrer: previousView.current?.location ?? (referrer === window.location.origin ? "" : referrer),
      page_title: page === "/" ? "Home" : page,
    };

    // Set sanitized metadata for automatically collected session and engagement events too.
    gtag("set", details);
    if (!configured.current) {
      gtag("js", new Date());
      gtag("config", measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      configured.current = true;
    }

    gtag("event", "page_view", { ...details, send_to: measurementId });
    previousView.current = { pathname, location };
  }, [measurementId, page, pathname]);

  if (!page) return null;
  return <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} />;
}
