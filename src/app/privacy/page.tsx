import Link from "next/link";
import { PrintButton } from "@/components/ui/print-button";

export const metadata = {
  title: "Privacy Policy | Stake Pesa",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-5 py-10 space-y-8">
      <header className="space-y-4 border-b border-line pb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-fg-secondary mt-1">Last Updated: April 13, 2026</p>
          </div>
          <PrintButton />
        </div>
        <p className="text-sm text-fg-secondary uppercase tracking-wider font-mono">
          Data Protection and Privacy Framework
        </p>
      </header>

      <div className="prose prose-invert max-w-none text-fg-secondary text-[15px] leading-relaxed space-y-6">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">1. Policy Overview and Scope</h2>
          <p>
            Stake Pesa ("we", "us", "our") respects your privacy and is committed to protecting your personal data. This comprehensive Privacy Policy outlines our practices regarding the collection, use, retention, and disclosure of personal data when you use the Stake Pesa platform.
          </p>
          <p>
            This Policy is strictly aligned with the Kenya Data Protection Act, 2019 (DPA) and the General Data Protection Regulation (GDPR) for our international users, ensuring a robust standard of data privacy and user rights across all jurisdictions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">2. Data We Collect</h2>
          <p>
            We collect the following categories of personal data to effectively operate our service:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Identity & Contact Data:</strong> Full name, email address, phone number (Crucially for M-Pesa integration).</li>
            <li><strong>Financial Data:</strong> Wallet balances, transaction history, M-Pesa payment references, and escrow ledger metadata. We do not store your direct banking pins or passwords.</li>
            <li><strong>Platform Data:</strong> Challenge participation records, dispute evidence, communications between users on the platform, and support tickets.</li>
            <li><strong>Technical & Telemetry Data:</strong> IP addresses, browser types, device identifiers, time-zone settings, and operating system details.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">3. Legal Bases and Purpose of Processing</h2>
          <p>
            Under the Kenyan DPA and GDPR, we rely on the following lawful bases to process your data:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Contractual Necessity:</strong> To provide you with wallet capabilities, challenge escrow settlements, and account management.</li>
            <li><strong>Legal Obligation:</strong> To comply with Anti-Money Laundering (AML) laws in Kenya, KYC regulations, tax requirements, and court orders.</li>
            <li><strong>Legitimate Interests:</strong> To detect and prevent fraud, ensure network security, conduct data analytics for platform improvement, and manage disputes.</li>
            <li><strong>Consent:</strong> For marketing communications where you have explicitly opted in. You may withdraw consent at any time.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">4. Data Sharing and Third-Party Disclosures</h2>
          <p>
            We may share your data under strict confidentiality agreements with:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Payment Gateways & Telecoms:</strong> Such as Safaricom (for M-Pesa processing) and IntaSend to facilitate deposits and withdrawals.</li>
            <li><strong>Cloud Service Providers:</strong> For secure hosting and database management (e.g., AWS, Vercel).</li>
            <li><strong>Regulatory & Law Enforcement Authorities:</strong> E.g., The Office of the Data Protection Commissioner (ODPC) in Kenya, or the Financial Reporting Centre (FRC), when legally compelled to do so to prevent crime or fraud.</li>
          </ul>
          <p>
            Stake Pesa categorically does not sell your personal data to third parties for independent marketing purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">5. International Data Transfers</h2>
          <p>
            As a digital platform, your data may be transferred to and stored in designated cloud server regions outside of Kenya. Where data crosses borders, we ensure adequate safeguards are implemented—such as Standard Contractual Clauses (SCCs)—to guarantee an equivalent level of protection as mandated by the Kenya DPA and GDPR provisions governing cross-border transfers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">6. Data Retention</h2>
          <p>
            We retain your personal data only as long as necessary to fulfill the purposes for which it was collected. For compliance with Kenyan financial and tax regulations, basic identity and transaction records may be kept for a statutory period (typically up to seven (7) years) even after account deletion. User-generated challenge data will be anonymized or securely deleted once no longer operationally needed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">7. Security Measures</h2>
          <p>
            We deploy robust technical and organizational measures including end-to-end encryption, strict access controls, secure network firewalls, and regular security audits to protect against unauthorized access, alteration, disclosure, or destruction of your personal data. However, the transmission of information via the internet carries inherent risks; thus, users are responsible for securing their account credentials.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">8. Data Subject Rights</h2>
          <p>
            Under the DPA and GDPR, you possess significant rights regarding your data:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Right to Access:</strong> Request copies of your personal data.</li>
            <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
            <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of data, subject to local regulatory retention mandates.</li>
            <li><strong>Right to Data Portability:</strong> Obtain your data in a structured, machine-readable format.</li>
            <li><strong>Right to Object/Restrict:</strong> Object to or limit processing based on legitimate interests.</li>
          </ul>
          <p>
            To exercise these rights, please submit a formalized request via our support desk. We are obligated by law to respond within thirty (30) days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">9. Cookies and Tracking Technologies</h2>
          <p>
            We use cookies and similar tracing technologies to track activity on Stake Pesa and enhance the user experience. You can instruct your browser to refuse all cookies; however, some core functionalities (like account authentication and secure sessions) may become unavailable.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">10. Policy Alterations</h2>
          <p>
            We reserve the right to amend this Privacy Policy periodically to reflect changes in regulatory standards or operational practices. Significant modifications will be explicitly communicated to you via email or prominent platform notifications.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-fg">11. Contact the Data Protection Officer</h2>
          <p>
            If you have questions, grievances, or want to assert your Data Subject Rights under Kenyan or International Law, please direct your correspondence to our Data Protection Officer (DPO) via the in-app support channels or our official legal contact email listed on the platform. You also have the right to lodge a complaint directly with the Office of the Data Protection Commissioner (ODPC) in Kenya.
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
