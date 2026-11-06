import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { ProfileForm } from "@/components/ProfileForm";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export const metadata: Metadata = { title: "Edit profile" };

export default function EditProfilePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-light">Edit profile</h1>
      <div className="card mt-8 p-6">
        <Suspense fallback={<div className="h-72" />}>
          <EditProfile />
        </Suspense>
      </div>
    </div>
  );
}

async function EditProfile() {
  const user = await requireUser("/dashboard/profile");
  const [row] = await db
    .select({ bio: schema.users.bio, links: schema.users.links })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);
  return <ProfileForm name={user.name} bio={row?.bio ?? ""} links={row?.links ?? []} avatarFile={user.avatarFile} />;
}
