import Link from "next/link";

export const metadata = {
  title: "Terms and Conditions | Stake Pesa",
};

export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-5 py-10 space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Stake Pesa Terms and Conditions</h1>
        <p className="text-sm text-fg-secondary">Last updated: March 20, 2026</p>
        <p className="text-sm text-fg-secondary">
          These Terms govern your use of Stake Pesa. By creating an account, logging in, funding a wallet,
          creating or joining a challenge, or otherwise using the platform, you agree to these Terms.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">1. Platform Purpose</h2>
        <p className="text-sm text-fg-secondary">
          Stake Pesa is a private peer challenge and accountability platform where users can create challenge agreements,
          escrow funds, and settle outcomes under platform policies. Stake Pesa is not an investment advisor,
          broker-dealer, fiduciary, bank, insurer, or legal representative for users.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">2. Eligibility and Account Responsibility</h2>
        <p className="text-sm text-fg-secondary">
          You must be legally capable of entering binding contracts in your jurisdiction. You are solely responsible for
          account security, all actions taken under your credentials, and ensuring that your use of the service is lawful.
          You must provide accurate and current identity/contact/payment details.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">3. User Conduct and Prohibited Use</h2>
        <p className="text-sm text-fg-secondary">
          You may not use Stake Pesa for unlawful, fraudulent, abusive, manipulative, coercive, or harmful activity,
          including money laundering, sanctions evasion, unauthorized gambling activities, identity fraud, account abuse,
          collusion, extortion, harassment, or any content/behavior violating applicable law or third-party rights.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">4. Wallet, Escrow, and Payment Processing</h2>
        <p className="text-sm text-fg-secondary">
          Wallet balances and escrow entries are ledger-based records maintained by platform systems and payment rails.
          Processing times may vary by external providers. We do not guarantee uninterrupted payment availability and are
          not liable for delays, provider outages, reversals, telecom interruptions, bank rail failure, or third-party API errors.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">5. Challenge Creation and Creator Liability</h2>
        <p className="text-sm text-fg-secondary">
          The challenge creator is responsible for defining clear terms, participants, and verification setup.
          Where creator-funded mode is selected, the creator is fully liable for funding obligations and applicable company fees.
          Invitees are not liable for creator-side fee obligations unless separately agreed in writing and permitted by law.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">6. Deletion Window and Cancellation Policy</h2>
        <p className="text-sm text-fg-secondary">
          Creator-initiated deletion is only available within 12 hours from challenge creation. Deletion triggers automatic reversal
          based on stake policy and platform logic, and platform fee liability remains chargeable to the creator. After 12 hours,
          the challenge is permanent for operational integrity and cannot be deleted through self-service controls.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">7. Disputes, Forfeiture, and Finality</h2>
        <p className="text-sm text-fg-secondary">
          Users must cooperate in good faith to resolve disputes. Stake Pesa may apply structured review procedures,
          request evidence, and set response deadlines. If a dispute remains unresolved for 7 days from dispute creation,
          stake forfeiture to company policy may be applied. Platform determinations in such cases are final to the extent
          permitted by law and are made to preserve system trust, prevent indefinite lockups, and mitigate abuse.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">8. Fees, Charges, and Set-Off Rights</h2>
        <p className="text-sm text-fg-secondary">
          We may charge platform fees, service fees, dispute-handling fees, or risk-control fees as disclosed in-app.
          You authorize Stake Pesa to deduct applicable fees from liable balances and to perform lawful set-off where necessary
          to satisfy unpaid obligations arising from your use of the platform.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">9. No Guarantee; Risk Acknowledgement</h2>
        <p className="text-sm text-fg-secondary">
          Participation in challenges carries financial risk. Outcomes may be disputed or unfavorable. You acknowledge that
          Stake Pesa does not guarantee winnings, profitability, uninterrupted service, or error-free operation.
          All services are provided on an "as is" and "as available" basis.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">10. Limitation of Liability</h2>
        <p className="text-sm text-fg-secondary">
          To the maximum extent permitted by law, Stake Pesa and its operators, officers, employees, contractors,
          and affiliates are not liable for indirect, incidental, special, consequential, punitive, or exemplary damages,
          including lost profits, lost opportunities, reputational loss, data loss, or business interruption.
          Aggregate liability for direct claims shall not exceed the total platform fees paid by you to Stake Pesa in
          the 3 months preceding the event giving rise to the claim.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">11. Indemnity</h2>
        <p className="text-sm text-fg-secondary">
          You agree to indemnify and hold harmless Stake Pesa from claims, losses, liabilities, penalties, and costs
          (including legal fees) arising out of your breach of these Terms, unlawful use, fraud, negligence, or disputes
          between you and other users.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">12. Compliance, Monitoring, and Enforcement</h2>
        <p className="text-sm text-fg-secondary">
          We may monitor usage, investigate suspicious activity, freeze flows, restrict features, suspend, or terminate accounts
          where we reasonably suspect policy breach, fraud, legal risk, or system abuse. We may cooperate with regulators,
          payment providers, and law enforcement where required.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">13. Intellectual Property and License</h2>
        <p className="text-sm text-fg-secondary">
          Platform code, branding, and product content are owned by Stake Pesa or licensors. You receive a limited,
          revocable, non-exclusive, non-transferable license to use the service for personal lawful use under these Terms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">14. Governing Law and Dispute Resolution</h2>
        <p className="text-sm text-fg-secondary">
          These Terms are governed by applicable laws of the operating jurisdiction specified in platform legal notices.
          You agree to attempt informal resolution first. Where permitted, disputes may be subject to binding arbitration
          or exclusive jurisdiction clauses disclosed in regional legal addenda.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">15. Amendments and Continued Use</h2>
        <p className="text-sm text-fg-secondary">
          We may update these Terms at any time for legal, operational, security, or product reasons. Continued use
          after updates constitutes acceptance of revised Terms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">16. Contact</h2>
        <p className="text-sm text-fg-secondary">
          For legal or policy inquiries, contact platform support through official channels listed in-app.
        </p>
      </section>

      <div className="pt-2">
        <Link href="/" className="text-sm text-green hover:underline">Back to home</Link>
      </div>
    </main>
  );
}
