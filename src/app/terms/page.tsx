import Link from "next/link";
import { PrintButton } from "@/components/ui/print-button";

export const metadata = {
  title: "Terms and Conditions | Stake Pesa",
};

export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-5 py-10 space-y-8">
      <header className="space-y-4 border-b border-line pb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Terms and Conditions</h1>
            <p className="text-sm text-fg-secondary mt-1">Last Updated: April 13, 2026</p>
          </div>
          <PrintButton />
        </div>
        <p className="text-sm text-fg-secondary uppercase tracking-wider font-mono">
          Stake Pesa Platform Agreement
        </p>
      </header>

      <div className="prose prose-invert max-w-none text-fg-secondary text-[15px] leading-relaxed space-y-6">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">1. Introduction and Acceptance of Terms</h2>
          <p>
            Welcome to Stake Pesa ("Company", "we", "our", "us"). These Terms and Conditions ("Terms") govern your access to and use of our peer challenge and accountability platform ("Platform"). By creating an account, depositing funds via supported payment gateways (including M-Pesa), or engaging in any activity on the Platform, you enter into a legally binding agreement in accordance with the Laws of Kenya, including but not limited to the Law of Contract Act (Cap 23) and the Consumer Protection Act (No. 46 of 2012).
          </p>
          <p>
            Users engaging from outside Kenya agree that while their local international laws (such as consumer protection directives in the EU) may apply, the primary enforcement and jurisdiction of these terms remain within the Republic of Kenya.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">2. Platform Purpose and Regulatory Status</h2>
          <p>
            Stake Pesa operates strictly as a peer-to-peer accountability and challenge resolution platform. <strong>We are not</strong> a financial institution, bank, investment advisor, or a licensed gambling operator under the Betting, Lotteries and Gaming Act (Cap 131) of Kenya. The Platform facilitates users in creating and participating in personal accountability challenges where stakes are placed in a conditional escrow model to motivate users to achieve specific outcomes. You acknowledge that Stake Pesa only provides technology to record commitments and manage conditional fund releases.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">3. Eligibility</h2>
          <p>
            To use the Platform, you must be at least 18 years of age and legally capable of entering into binding contracts. You must provide valid, accurate, and up-to-date KYC (Know Your Customer) information as required. We reserve the right to suspend accounts or confiscate funds if we determine that a user is underage or operating from a restricted jurisdiction under international sanctions or local statutory bans.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">4. Escrow Services and M-Pesa Integration</h2>
          <p>
            4.1 <strong>Fund Custody:</strong> Stakes deposited onto the Platform are held in distinct programmatic or segregated partner accounts. Stake Pesa acts solely as an escrow technology provider. We integrate with licensed Payment Service Providers (PSPs) and Mobile Money Networks (such as Safaricom M-Pesa).
          </p>
          <p>
            4.2 <strong>Transactions & Delays:</strong> Deposits and withdrawals are subject to the operational uptime of M-Pesa and IntaSend (our gateway partners). Stake Pesa is not liable for delayed crediting, telecom outages, banking network failures, or API disruptions affecting mobile money transactions in Kenya or internationally.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">5. Challenge Creation, Dispute, and Resolution</h2>
          <p>
            5.1 <strong>Creator Obligations:</strong> When creating a challenge, the Creator is entirely responsible for clearly defining the terms, participation conditions, and truth verification methods.
          </p>
          <p>
            5.2 <strong>Cancellation:</strong> Challenges can only be canceled within an initial 12-hour grace period if no other participants have committed non-refundable stakes. Beyond this window, challenges are considered binding.
          </p>
          <p>
            5.3 <strong>Dispute Escalation:</strong> In the event of a dispute, users must engage in good-faith resolution. Unresolved disputes extending beyond 7 days will prompt Stake Pesa intervention. The Platform reserves the right to review evidence and make final, binding determinations to prevent system gridlock, consistent with alternative dispute resolution principles.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">6. Fees and Deductions</h2>
          <p>
            Stake Pesa charges platform service fees, withdrawal processing fees, and potential dispute-handling fees. By using the Platform, you authorize Stake Pesa to automatically deduct these obligations directly from your wallet balance prior to executing any withdrawals. Fee structures are subject to periodic review and will be communicated in-app.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">7. Anti-Money Laundering (AML) & Prohibited Conduct</h2>
          <p>
            You agree to comply with the Proceeds of Crime and Anti-Money Laundering Act (POCAMLA) of Kenya and relevant international AML directives. You shall not use Stake Pesa for money laundering, terrorism financing, fraudulent schemes, unauthorized syndicating, harassment, or to exploit vulnerable individuals. Suspicious activity will be reported to the Financial Reporting Centre (FRC) in Kenya or equivalent international bodies without prior notice to the user.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">8. Limitation of Liability and Indemnification</h2>
          <p>
            To the maximum extent permitted by Kenyan and applicable international law, Stake Pesa, its directors, and affiliates shall not be liable for any indirect, incidental, consequential, special, or exemplary damages arising out of your use of the Platform. Our maximum aggregate liability for any direct claim shall not exceed the total platform fees paid by you in the three (3) months preceding the claim.
          </p>
          <p>
            You agree to indemnify and hold Stake Pesa harmless from any claims, penalties, or legal costs arising from your violation of these Terms, third-party rights, or any applicable law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">9. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms shall be governed by, construed, and enforced in accordance with the Laws of the Republic of Kenya. Any dispute, controversy, or claim arising out of or relating to these Terms, including breach, termination, or invalidity thereof, shall first be subjected to mediation in Nairobi, Kenya. If unresolved, it shall be settled by binding arbitration in accordance with the Nairobi Centre for International Arbitration (NCIA) Rules.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">10. Amendments</h2>
          <p>
            Stake Pesa reserves the right to amend these Terms at any time. Continued use of the platform following the publication of changes signifies your irrevocable acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">11. Contact Information</h2>
          <p>
            For legal inquiries or statutory communications, please contact our legal team via support channels in-app. Official notices may be addressed to our registered operational offices in Nairobi, Kenya.
          </p>
        </section>

      </div>

      <div className="pt-6 border-t border-line mt-10 print:hidden">
        <Link href="/" className="text-sm text-green hover:underline font-medium">
          &larr; Return to Homepage
        </Link>
      </div>
    </main>
  );
}
