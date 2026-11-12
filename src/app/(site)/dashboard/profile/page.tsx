import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { NotificationSwitch } from "@/components/NotificationSwitch";
import { ProfileForm } from "@/components/ProfileForm";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { formatDate, siteUrl } from "@/lib/format";

export const metadata: Metadata = { title: "Edit profile" };

export default function EditProfilePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <Suspense fallback={<div className="h-96" />}>
        <EditProfile />
      </Suspense>
    </div>
  );
}

async function EditProfile() {
  const user = await requireUser("/dashboard/profile");
  const [row] = await db
    .select({ bio: schema.users.bio, links: schema.users.links, createdAt: schema.users.createdAt, emailNotifications: schema.users.emailNotifications })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);
  const profilePath = `/u/${user.handle}`;
  return (
    <>
      <Link href={profilePath} className="intro-rise inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 5l-7 7 7 7" />
        </svg>
        Your profile
      </Link>
      <div className="intro-rise mt-4 flex flex-wrap items-end justify-between gap-4" style={{ "--d": "70ms" } as React.CSSProperties}>
        <h1 className="text-4xl font-light">Edit profile</h1>
        <Link href={profilePath} className="link text-sm">
          View public profile
        </Link>
      </div>
      <ProfileForm
        name={user.name}
        handle={user.handle}
        joined={row ? formatDate(row.createdAt) : null}
        profileUrl={`${siteUrl()}${profilePath}`}
        bio={row?.bio ?? ""}
        links={row?.links ?? []}
        avatarFile={user.avatarFile}
      />
      <NotificationSwitch initial={row?.emailNotifications ?? true} />
    </>
  );
}
