import { toggleAppreciation, toggleFollow } from "@/app/actions/posts";
import { HeartIcon } from "./PostCard";
import { SubmitButton } from "./SubmitButton";

export function AppreciateButton({
  slug,
  count,
  appreciated,
  disabled,
}: {
  slug: string;
  count: number;
  appreciated: boolean;
  disabled?: boolean;
}) {
  const label = (
    <span className="inline-flex items-center gap-2">
      <HeartIcon className="h-4 w-4" filled={appreciated} />
      {appreciated ? "Appreciated" : "Appreciate"}
      <span className="text-muted">{count}</span>
    </span>
  );
  if (disabled) {
    return (
      <span className="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-soft" title="Appreciations">
        {label}
      </span>
    );
  }
  return (
    <form action={toggleAppreciation.bind(null, slug)}>
      <SubmitButton
        className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
          appreciated ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-soft hover:border-ink hover:text-ink"
        }`}
        pendingText="…"
      >
        {label}
      </SubmitButton>
    </form>
  );
}

export function FollowButton({ handle, following, returnTo }: { handle: string; following: boolean; returnTo: string }) {
  return (
    <form action={toggleFollow.bind(null, handle, returnTo)}>
      <SubmitButton className={following ? "btn-ghost px-5 py-2" : "btn-primary px-5 py-2"} pendingText="…">
        {following ? "Following" : "Follow"}
      </SubmitButton>
    </form>
  );
}
