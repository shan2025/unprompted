"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setEmailNotifications } from "@/app/actions/profile";

/** Its own small form beside Edit profile: it saves the moment it's flipped. */
export function NotificationSwitch({ initial }: { initial: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [on, setOn] = useOptimistic(saved);
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState(false);

  function flip(next: boolean) {
    setProblem(false);
    start(async () => {
      setOn(next);
      const { ok } = await setEmailNotifications(next);
      if (ok) setSaved(next);
      else setProblem(true);
    });
  }

  return (
    <section id="notifications" className="mt-12 scroll-mt-8 border-t border-line pt-8">
      <h2 className="text-2xl font-normal">Email notifications</h2>
      <label className="mt-4 flex max-w-xl cursor-pointer items-start gap-3">
        <input type="checkbox" checked={on} onChange={(e) => flip(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
        <span>
          <span className="block font-medium">Tell me when someone follows me, comments on my work or appreciates it</span>
          <span className="mt-0.5 block text-sm text-muted">
            Emails about orders, payments and questions from buyers always arrive, because they need you to act.
          </span>
        </span>
      </label>
      <p className="mt-2 h-5 text-sm text-muted" role="status">
        {problem ? "That didn't save. Log in again and retry." : pending ? "Saving…" : null}
      </p>
    </section>
  );
}
