import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import "./auth.css";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: Props) {
  return (
    <div className="auth-shell">
      {/* There's no site header on these pages, so the logo is the way home. */}
      <Link href="/" aria-label="Unprompters home" className="auth-home">
        <Logo />
      </Link>
      <aside className="auth-hero" aria-label="About Unprompters">
        <div className="auth-figures" aria-hidden="true">
          <svg viewBox="0 0 792 600" preserveAspectRatio="xMidYMid meet" focusable="false">
            <defs>
              <linearGradient id="auth-charcoal" x2=".92" y2=".65" gradientUnits="objectBoundingBox">
                <stop stopColor="#685646" />
                <stop offset=".55" stopColor="#40372e" />
                <stop offset="1" stopColor="#302a23" />
              </linearGradient>
              <linearGradient id="auth-clay" x1=".3" y1="0" x2=".86" y2=".92" gradientUnits="objectBoundingBox">
                <stop stopColor="#ed9a64" />
                <stop offset=".53" stopColor="#bc663b" />
                <stop offset="1" stopColor="#883f20" />
              </linearGradient>
              <clipPath id="auth-square"><path d="M141 130h319v296H141z" /></clipPath>
            </defs>
            <path fill="url(#auth-charcoal)" d="M141 130h319v296H141z" />
            <ellipse cx="533" cy="387" rx="155" ry="161" fill="url(#auth-clay)" opacity=".92" />
            <ellipse cx="533" cy="387" rx="155" ry="161" fill="#763513" opacity=".48" clipPath="url(#auth-square)" />
            <path d="M268 52v525M436 52v525M600 52v534" fill="none" stroke="#4b3d30" strokeOpacity=".35" />
            <path d="m178 571 165-112 148 112Z" fill="none" stroke="#37291c" strokeWidth="9" />
          </svg>
        </div>
        <div className="auth-caption">
          <p>Made by people, for people who notice.</p>
          <ul>
            <li>Share your work with a human-made score</li>
            <li>Follow creators you love</li>
            <li>Sell directly in the marketplace</li>
          </ul>
        </div>
      </aside>
      <div className="auth-form-pane">
        <section className="auth-card" aria-labelledby="auth-title">
          <h1 id="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
        </section>
      </div>
    </div>
  );
}
