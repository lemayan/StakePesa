import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Stake Pesa",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-5 py-10 space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Stake Pesa Privacy Policy</h1>
        <p className="text-sm text-fg-secondary">Last updated: March 20, 2026</p>
        <p className="text-sm text-fg-secondary">
          This Privacy Policy explains how Stake Pesa collects, uses, stores, shares, and protects personal data.
          By using the platform, you acknowledge this Policy.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">1. Data We Collect</h2>
        <p className="text-sm text-fg-secondary">
          We may collect account identifiers (name, email), authentication metadata, wallet and transaction records,
          challenge participation data, device/network information, usage telemetry, security events, dispute evidence,
          support communications, and legally required compliance records.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">2. Why We Process Data</h2>
        <p className="text-sm text-fg-secondary">
          We process data to operate user accounts, secure access, execute payments and escrow flows, enforce policy,
          detect/prevent fraud, resolve disputes, provide support, comply with law, and improve platform reliability.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">3. Legal Bases</h2>
        <p className="text-sm text-fg-secondary">
          Processing may be based on contract performance, legitimate interests (security and abuse prevention),
          legal obligations, and consent where required.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">4. Payments and Financial Data</h2>
        <p className="text-sm text-fg-secondary">
          Payment flows may involve third-party providers. We store transaction references, status, callback metadata,
          and ledger entries required for reconciliation, security, and auditability. We do not guarantee external provider uptime.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">5. Fraud and Risk Controls</h2>
        <p className="text-sm text-fg-secondary">
          We use automated and manual controls to detect abnormal behavior, suspicious transactions, coordinated abuse,
          and policy violations. We may limit features, hold flows, request additional verification, or suspend accounts.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">6. Data Sharing</h2>
        <p className="text-sm text-fg-secondary">
          We may share data with service providers (hosting, auth, communications, payments), compliance partners,
          professional advisors, and competent authorities where legally required. We do not sell personal data in ways
          prohibited by law.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">7. Retention</h2>
        <p className="text-sm text-fg-secondary">
          We retain data for as long as necessary for contractual operations, legal obligations, dispute handling,
          fraud prevention, tax/accounting obligations, and defense of claims. Retention windows may differ by record type.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">8. Security Safeguards</h2>
        <p className="text-sm text-fg-secondary">
          We apply technical and organizational controls, including access controls, audit trails, and monitoring.
          No system is perfectly secure; you are responsible for strong credentials and safe account practices.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">9. International Transfers</h2>
        <p className="text-sm text-fg-secondary">
          Data may be processed in jurisdictions different from your own. Where required, we implement safeguards
          appropriate to lawful transfer and processing.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">10. Your Rights</h2>
        <p className="text-sm text-fg-secondary">
          Depending on your jurisdiction, you may request access, correction, deletion, restriction, portability,
          objection, or withdrawal of consent. Some rights may be limited by legal, security, or fraud-prevention obligations.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">11. Cookies and Similar Technologies</h2>
        <p className="text-sm text-fg-secondary">
          We may use cookies/local storage for authentication continuity, preferences, analytics, and security controls.
          Blocking certain storage may degrade platform functionality.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">12. Minors</h2>
        <p className="text-sm text-fg-secondary">
          The platform is not intended for minors where prohibited by law. If we learn data was collected in violation
          of applicable age requirements, we may restrict or delete the account and related records as permitted.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">13. Policy Updates</h2>
        <p className="text-sm text-fg-secondary">
          We may revise this Policy to reflect legal, technical, or operational changes. Material updates may be posted
          in-app or via account communication channels.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">14. Contact</h2>
        <p className="text-sm text-fg-secondary">
          For privacy requests, submit through official support channels listed in-app.
        </p>
      </section>

      <div className="pt-2">
        <Link href="/" className="text-sm text-green hover:underline">Back to home</Link>
      </div>
    </main>
  );
}
