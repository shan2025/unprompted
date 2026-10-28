import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage, Section } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Unprompters for support, reports, refunds and grievances.",
};

export default function ContactPage() {
  return (
    <LegalPage
      eyebrow="Help"
      title="Contact us"
      intro={
        <p>
          Questions, problems with an order, a listing you think breaks the rules, or a privacy request: email <ContactLine />.
          We reply within 2 business days.
        </p>
      }
    >
      <Section title="Business details">
        <p>
          {SITE.legalName}
          <br />
          {SITE.address}
          <br />
          Email: <ContactLine />
        </p>
      </Section>

      <Section title="Grievance Officer">
        <p>
          {SITE.grievanceOfficer}. Email <ContactLine /> with &ldquo;Grievance&rdquo; in the subject. We acknowledge
          complaints within 48 hours and aim to resolve them within 30 days.
        </p>
      </Section>

      <Section title="Quick links">
        <p>
          To report a specific listing, use <strong className="text-ink">Report this listing</strong> on its page. For
          refunds, see the <Link href="/refunds" className="link text-ink">refund policy</Link>. For how your data is used, see
          the <Link href="/privacy" className="link text-ink">privacy policy</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
