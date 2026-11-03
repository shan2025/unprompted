import type { Metadata } from "next";
import { ContactLine, LegalPage, List, Section } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund & cancellation policy",
  description: "When and how purchases on Unprompters can be refunded or cancelled.",
};

export default function RefundsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Refund & cancellation policy"
      intro={
        <p>
          Most things sold on {SITE.name} are digital and delivered instantly, so refunds work a little differently from
          physical goods. This policy explains when you can get your money back.
        </p>
      }
    >
      <Section title="Who refunds you">
        <p>
          You pay the seller directly through their payment link, so {SITE.name} never receives or holds your money. Refunds
          come from the seller. We can&apos;t issue them ourselves, but we can step in if a seller doesn&apos;t follow this
          policy, including removing their listings and closing their account. Your payment provider may also offer its own
          protection.
        </p>
        <p>Listings marked DEMO are examples. No money changes hands for them, so there is nothing to refund.</p>
      </Section>

      <Section title="When sellers must give a full refund">
        <List>
          <li>You paid, and the seller didn&apos;t unlock the work or declined your order</li>
          <li>The work was never delivered, or the download or link doesn&apos;t work and the seller doesn&apos;t fix it within 3 days</li>
          <li>What you received is materially different from the listing</li>
          <li>
            The listing is removed after review because the seller misrepresented how much AI was used, or didn&apos;t have
            the rights to sell it
          </li>
          <li>You were charged twice or charged the wrong amount</li>
        </List>
      </Section>

      <Section title="When refunds aren't available">
        <List>
          <li>You changed your mind after the work was delivered or unlocked</li>
          <li>The work matches its listing, preview and license</li>
          <li>Exclusive-transfer purchases after the rights have been transferred, except for the reasons above</li>
        </List>
      </Section>

      <Section title="Physical items">
        <p>
          For physical items (such as original artwork), you can cancel before the seller ships. After delivery you can
          return an item that arrives damaged or not as described within 7 days; the seller covers return shipping in those
          cases.
        </p>
      </Section>

      <Section title="How to ask for a refund">
        <p>
          Ask the seller first, using the contact details on your payment receipt. If they don&apos;t sort it out, email{" "}
          <ContactLine /> within 7 days of purchase with your order details, your payment reference and what went wrong.
          We&apos;ll respond within 2 business days and take it up with the seller. Sellers should return refunds to the
          original payment method within 5 to 7 business days; your bank may take longer to show it.
        </p>
      </Section>

      <Section title="Cancellations by the seller">
        <p>If a seller can&apos;t deliver, they must cancel the order and give you a full refund.</p>
      </Section>
    </LegalPage>
  );
}
