"use client";

/**
 * For listings with no way to pay online: takes the buyer to the "Ask the
 * creator" form (#ask) with a starter message, and they agree payment and
 * delivery by email. Without JavaScript the link still jumps to the form.
 */
export function EnquireToBuy({ title, creatorName, merch }: { title: string; creatorName: string; merch: boolean }) {
  const firstName = creatorName.split(" ")[0];
  const starter = merch
    ? `Hi ${firstName}, I'd like to order "${title}".\nSize or option: \nDeliver to (city, country): \nHow can I pay?`
    : `Hi ${firstName}, I'd like to buy "${title}". How can I pay?`;

  function open(event: React.MouseEvent<HTMLAnchorElement>) {
    const card = document.getElementById("ask");
    if (!card) return;
    event.preventDefault();
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    const box = card.querySelector("textarea");
    if (box) {
      if (!box.value.trim()) box.value = starter;
      box.focus({ preventScroll: true });
      box.setSelectionRange(box.value.length, box.value.length);
    }
    history.replaceState(null, "", "#ask");
  }

  return (
    <div>
      <a href="#ask" onClick={open} className="btn-accent block w-full py-3 text-center text-[15px]">
        Enquire to buy
      </a>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Send {firstName} a message and you&apos;ll agree payment{merch ? " and delivery" : ""} by email. Online checkout isn&apos;t available for this {merch ? "product" : "listing"} yet.
      </p>
    </div>
  );
}
