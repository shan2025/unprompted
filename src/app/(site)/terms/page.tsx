import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage, List, Section } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The rules for buying and selling on Unprompters.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of service"
      intro={
        <p>
          These terms are an agreement between you and {SITE.legalName} (&ldquo;we&rdquo;), which runs {SITE.name}. By
          creating an account or using the site you agree to them. If you don&apos;t agree, please don&apos;t use the site.
        </p>
      }
    >
      <Section title="1. What Unprompters is">
        <p>
          {SITE.name} is an online marketplace where people sell work they made themselves (code, websites, writing,
          poetry, art, photography, design, music, ideas and more) and where every listing shows an estimate of how much AI
          was involved. We provide the platform. The seller, not {SITE.name}, is the creator and seller of each listing.
        </p>
      </Section>

      <Section title="2. Your account">
        <List>
          <li>You must be 18 or older.</li>
          <li>Give accurate details and keep your password private. You&apos;re responsible for what happens in your account.</li>
          <li>One person, one account, unless we agree otherwise.</li>
        </List>
      </Section>

      <Section title="3. Selling: your promises">
        <p>When you list something, you confirm that:</p>
        <List>
          <li>You made it, or you hold all the rights needed to sell it under the license you choose.</li>
          <li>
            Your <strong className="text-ink">AI disclosure is accurate</strong> for every stage of the work, and any process
            evidence you attach is genuine.
          </li>
          <li>The listing doesn&apos;t break any law or anyone else&apos;s rights (copyright, trademark, privacy).</li>
          <li>You will deliver what the listing describes to buyers who pay for it.</li>
        </List>
        <p>
          Work that discloses more than 50% AI involvement can&apos;t be listed. Misrepresenting how much AI you used is a
          serious breach of these terms and can lead to removal of listings and closure of your account.
        </p>
      </Section>

      <Section title="4. About the AI-involvement score">
        <p>
          Each score is an <strong className="text-ink">estimate</strong>, not a certificate or a guarantee. It combines
          the seller&apos;s disclosure, automated analysis and process evidence, and is shown as a range. Automated AI
          detection is known to be unreliable, so we never treat it as proof. How it works is explained on{" "}
          <Link href="/standard" className="link text-ink">
            how scoring works
          </Link>
          . Buyers should judge each listing, including its evidence, for themselves.
        </p>
      </Section>

      <Section title="5. Buying">
        <List>
          <li>Each listing states its price and license (personal use, commercial use, or exclusive transfer).</li>
          <li>The license is granted by the seller to you. Use the work only as that license allows.</li>
          <li>
            &ldquo;Exclusive transfer&rdquo; listings are sold once; the seller agrees not to sell or license that work again.
          </li>
          <li>
            Paid checkout is being introduced in stages. Until it is live, purchases on the site are marked as demo purchases
            and no money is taken. See our <Link href="/refunds" className="link text-ink">refund policy</Link>.
          </li>
        </List>
      </Section>

      <Section title="6. Fees">
        <p>
          Listing is free. We currently charge no commission. Before we introduce any fee we will publish it on the site and
          tell sellers in advance; it will apply only to sales made after that date.
        </p>
      </Section>

      <Section title="7. What's not allowed">
        <List>
          <li>Work that is mostly AI-generated, or misleading AI disclosures</li>
          <li>Work you didn&apos;t make or don&apos;t have the rights to sell</li>
          <li>Illegal content, hate, harassment, sexual content involving minors, or content that exploits anyone</li>
          <li>Malware, scams, or misleading listings</li>
          <li>Attempts to manipulate scores, reviews or reports, including filing false reports</li>
        </List>
      </Section>

      <Section title="8. Reports, reviews and removal">
        <p>
          Anyone signed in can report a listing. Listings where automated checks disagree with the seller&apos;s disclosure,
          or that are reported, may be reviewed by a person and held, approved or removed. Sellers can respond with evidence
          and ask us to reconsider any decision by emailing <ContactLine />.
        </p>
      </Section>

      <Section title="9. Your content and our license to show it">
        <p>
          You keep ownership of what you list. You give us a limited, non-exclusive, royalty-free license to store, analyse,
          display and promote your listings only to run and market {SITE.name}. This license ends when you remove a listing,
          except for copies buyers have already purchased. We will never use your work to train AI models or license it to
          anyone who will.
        </p>
      </Section>

      <Section title="10. Copyright complaints">
        <p>
          If you believe a listing infringes your copyright, email <ContactLine /> with the listing link, proof of your
          rights and your contact details. We will act on valid notices as required by Indian law.
        </p>
      </Section>

      <Section title="11. Disclaimers and liability">
        <p>
          We provide the site &ldquo;as is&rdquo;. We don&apos;t guarantee that listings, scores or seller statements are
          accurate, or that the site will always be available. To the extent the law allows, we are not liable for indirect
          or consequential losses, and our total liability to you is limited to the fees you paid us in the 12 months before
          the claim. Nothing in these terms limits rights you have under consumer protection law.
        </p>
      </Section>

      <Section title="12. Ending your account">
        <p>
          You can close your account at any time by emailing us. We may suspend or close accounts that break these terms.
          Sections that by their nature should survive (such as licenses already granted to buyers) continue after closure.
        </p>
      </Section>

      <Section title="13. Law and disputes">
        <p>
          These terms are governed by the laws of India. Please contact us first so we can try to resolve any dispute. If we
          can&apos;t, the courts of India will have jurisdiction.
        </p>
      </Section>

      <Section title="14. Contact and grievances">
        <p>
          Grievance Officer: {SITE.grievanceOfficer}, {SITE.legalName}, {SITE.address}. Email <ContactLine />. We
          acknowledge complaints within 48 hours and aim to resolve them within 30 days. See also our{" "}
          <Link href="/privacy" className="link text-ink">
            privacy policy
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
