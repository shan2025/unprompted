import { withdrawListing } from "@/app/actions/listings";
import { SubmitButton } from "./SubmitButton";

export function WithdrawListing({ slug }: { slug: string }) {
  return <details className="text-sm"><summary className="cursor-pointer text-muted">Withdraw…</summary><form action={withdrawListing} className="mt-2 max-w-sm space-y-2"><input type="hidden" name="slug" value={slug} /><p className="text-ink-soft">Stop new sales and hide this listing from public browsing. Existing buyers keep access and pending orders can still be confirmed.</p><SubmitButton className="btn-ghost">Withdraw listing</SubmitButton></form></details>;
}
