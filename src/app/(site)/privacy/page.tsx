import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage, List, Section } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Unprompters collects, why, who it's shared with, and your rights.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy policy"
      intro={
        <p>
          {SITE.name} is run by {SITE.legalName} (&ldquo;we&rdquo;). This policy explains what personal data we collect when
          you use the site, why, and what you can do about it. We wrote it to follow India&apos;s Digital Personal Data
          Protection Act, 2023. The short version: we collect only what the marketplace needs, we never sell your data, and
          <strong className="text-ink"> we never use your work to train AI or share it with anyone who will.</strong>
        </p>
      }
    >
      <Section title="What we collect">
        <List>
          <li>
            <strong className="text-ink">Account details:</strong> your name, email address and a scrambled (hashed)
            version of your password. We can&apos;t see your actual password.
          </li>
          <li>
            <strong className="text-ink">What you list:</strong> titles, descriptions, previews, the work you deliver to
            buyers, images, your AI disclosure, process evidence links and notes.
          </li>
          <li>
            <strong className="text-ink">Activity on the site:</strong> purchases, reports you file, and the review history
            of your listings.
          </li>
          <li>
            <strong className="text-ink">One login cookie</strong> that keeps you signed in. We use no advertising or
            tracking cookies.
          </li>
          <li>
            <strong className="text-ink">Technical logs</strong> kept by our hosting providers (such as IP address and
            browser type) to run the service and keep it secure.
          </li>
        </List>
      </Section>

      <Section title="Why we use it">
        <List>
          <li>To create and run your account and let you buy and sell.</li>
          <li>
            To calculate each listing&apos;s AI-involvement score. Your text and image files are analysed by our own
            software for this purpose only.
          </li>
          <li>To review reported or flagged listings and keep the marketplace honest.</li>
          <li>To contact you about your account, listings, purchases or a report.</li>
          <li>To keep the service secure and meet our legal obligations.</li>
        </List>
        <p>
          We use your data on the basis of your consent, which you give when you create an account, and for the legitimate
          uses the law allows, such as preventing fraud. You can withdraw consent at any time by deleting your account.
        </p>
      </Section>

      <Section title="What's public">
        <p>
          Your name, profile handle, bio, published listings, their previews, AI scores and process evidence are public.
          Your email address is never shown publicly. The full deliverable is shown only to buyers who have purchased it.
        </p>
      </Section>

      <Section title="Who we share it with">
        <p>We do not sell personal data. We share it only with the services that run the site:</p>
        <List>
          <li>
            <strong className="text-ink">Vercel</strong>: hosts the website (servers may be outside India).
          </li>
          <li>
            <strong className="text-ink">Supabase</strong>: stores the database, in Mumbai, India.
          </li>
          <li>
            A <strong className="text-ink">payment provider</strong>, once paid checkout is switched on, to process
            payments.
          </li>
        </List>
        <p>
          We may also disclose data where Indian law requires it, for example to a court or government authority with a
          valid order.
        </p>
      </Section>

      <Section title="Your work and AI">
        <p>
          We will never sell, license or give your listings, previews, deliverables or images to anyone for training AI
          models, and we do not train AI models on them ourselves.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your data while your account is open. When you delete your account we delete your personal data within
          30 days, except records we must keep by law (for example, records of payments), which we keep only as long as
          required.
        </p>
      </Section>

      <Section title="Your rights">
        <p>Under the Digital Personal Data Protection Act, 2023, you can:</p>
        <List>
          <li>Ask what personal data we hold about you and how it&apos;s used</li>
          <li>Ask us to correct, complete or update it</li>
          <li>Ask us to delete it</li>
          <li>Withdraw your consent</li>
          <li>Nominate someone to exercise these rights on your behalf</li>
          <li>Raise a complaint with our Grievance Officer, and then with the Data Protection Board of India</li>
        </List>
        <p>
          To use any of these rights, email <ContactLine />. We&apos;ll respond within 30 days.
        </p>
      </Section>

      <Section title="Children">
        <p>
          You must be 18 or older to use {SITE.name}. We don&apos;t knowingly collect data from anyone under 18; if we learn
          we have, we&apos;ll delete it.
        </p>
      </Section>

      <Section title="Security">
        <p>
          Passwords are stored hashed, connections are encrypted, and database access is restricted. No system is perfectly
          secure, but if a breach affects your data we will tell you and the authorities as the law requires.
        </p>
      </Section>

      <Section title="Grievance Officer">
        <p>
          {SITE.grievanceOfficer}
          <br />
          {SITE.legalName}, {SITE.address}
          <br />
          Email: <ContactLine />
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If we change this policy in a way that matters, we&apos;ll tell you by email or on the site before it takes effect.
          See also our <Link href="/terms" className="link text-ink">terms of service</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
