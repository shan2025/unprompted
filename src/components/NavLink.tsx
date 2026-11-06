"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

type Props = { href: string; className?: string; children: React.ReactNode };

/**
 * A header link that's underlined while you're in its section. The current
 * path is only known at request time, so the plain link is prerendered and
 * the underline streams in.
 */
export function NavLink(props: Props) {
  return (
    <Suspense fallback={<Plain {...props} active={false} />}>
      <Current {...props} />
    </Suspense>
  );
}

function Current(props: Props) {
  const pathname = usePathname();
  return <Plain {...props} active={pathname === props.href || pathname.startsWith(`${props.href}/`)} />;
}

function Plain({ href, className = "", children, active }: Props & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`border-b-2 py-1 transition-[opacity,border-color] hover:opacity-60 ${active ? "border-ink" : "border-transparent"} ${className}`}
    >
      {children}
    </Link>
  );
}
