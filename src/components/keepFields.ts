"use client";

import { startTransition, type FormEvent } from "react";

/**
 * An onSubmit handler that runs a form action without React clearing the form
 * afterwards. With a plain `<form action>`, React 19 resets every field once the
 * action finishes, so a validation error wipes out what the person typed.
 * Keep `action={action}` on the form too, so it still works before JavaScript loads.
 */
export function keepFields(action: (data: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => action(data));
  };
}
