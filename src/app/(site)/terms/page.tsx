import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage, List, Section } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The rules for sharing, buying and selling on Unprompters.",
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
          {SITE.name} is a place to explore work people made themselves (writing, poetry, art, photography, design, music,
          film, code, websites, handicrafts, ideas and more). Creators share work for free as Journal posts or sell it as
          listings, and every piece shows an estimate of how much AI was involved. People can follow creators, appreciate
          and comment on posts, and ask a creator about a piece. We provide the platform. The creator, not {SITE.name}, is
          the author and, where it&apos;s for sale, the seller of each piece.
        </p>
      </Section>

      <Section title="2. Your account">
        <List>
          <li>You must be 18 or older.</li>
          <li>Give accurate details and keep your password private. You&apos;re responsible for what happens in your account.</li>
          <li>One person, one account, unless we agree otherwise.</li>
        </List>
      </Section>

      <Section title="3. Sharing and selling: your promises">
        <p>When you post or list something, you confirm that:</p>
        <List>
          <li>
            You made it, or you hold all the rights needed to share it and, if you sell it, to sell it under the license
            you choose. A video you link must be your own.
          </li>
          <li>
            Your <strong className="text-ink">AI disclosure is accurate</strong> for every stage of the work, and any process
            evidence you attach is genuine.
          </li>
          <li>The post or listing doesn&apos;t break any law or anyone else&apos;s rights (copyright, trademark, privacy).</li>
          <li>If you sell, you will deliver what the listing describes to buyers who pay for it.</li>
          <li>
            Your payment link is your own and charges the listed price. You&apos;ll check payments honestly, and you&apos;re
            responsible for refunds and for any tax on your sales.
          </li>
        </List>
        <p>
          Work that discloses more than 50% AI involvement can&apos;t be posted or listed. Misrepresenting how much AI you
          used is a serious breach of these terms and can lead to removal of your work and closure of your account.
        </p>
      </Section>

      <Section title="4. About the AI-involvement score">
        <p>
          Each score is an <strong className="text-ink">estimate</strong>, not a certificate or a guarantee. It combines
          the creator&apos;s disclosure, automated analysis and process evidence, and is shown as a range. Automated AI
          detection is known to be unreliable, so we never treat it as proof, and video can&apos;t be scanned at all. How it
          works is explained on{" "}
          <Link href="/standard" className="link text-ink">
            how scoring works
          </Link>
          . Judge each piece, including its evidence, for yourself.
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
            You pay the seller directly, through the seller&apos;s own payment link. {SITE.name} doesn&apos;t process, receive or
            hold the money, and the sale is between you and the seller. The seller unlocks the work after checking your
            payment. See our <Link href="/refunds" className="link text-ink">refund policy</Link>.
          </li>
          <li>Listings marked DEMO are examples. No money changes hands for them.</li>
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
          <li>Work you didn&apos;t make or don&apos;t have the rights to share or sell, including other people&apos;s videos</li>
          <li>Illegal content, hate, harassment, sexual content involving minors, or content that exploits anyone</li>
          <li>Malware, scams, spam, or misleading posts, listings or comments</li>
          <li>Abusive comments, or using &ldquo;Ask the creator&rdquo; to harass, spam or advertise</li>
          <li>Attempts to manipulate scores, appreciations, reviews or reports, including filing false reports</li>
        </List>
      </Section>

      <Section title="8. Reports, reviews and removal">
        <p>
          Anyone signed in can report a post, listing or comment. Work where automated checks disagree with the
          creator&apos;s disclosure, or that is reported, may be reviewed by a person and held, approved or removed.
          Creators can respond with evidence and ask us to reconsider any decision by emailing <ContactLine />.
        </p>
      </Section>

      <Section title="9. Your content and our license to show it">
        <p>
          You keep ownership of what you post or list, and of your comments. You give us a limited, non-exclusive,
          royalty-free license to store, analyse, display and promote it only to run and market {SITE.name}. This license
          ends when you delete the work, except for copies buyers have already purchased. We will never use your work to
          train AI models or license it to anyone who will.
        </p>
      </Section>

      <Section title="10. Copyright complaints">
        <p>
          If you believe a post or listing infringes your copyright, email <ContactLine /> with its link, proof of your
          rights and your contact details. We will act on valid notices as required by Indian law.
        </p>
      </Section>

      <Section title="11. Disclaimers and liability">
        <p>
          We provide the site &ldquo;as is&rdquo;. We don&apos;t guarantee that posts, listings, scores or creators&apos;
          statements are accurate, or that the site will always be available. To the extent the law allows, we are not liable for indirect
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
