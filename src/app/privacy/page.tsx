import { LegalLayout } from "@/components/sections/legal-layout";

export const metadata = {
  title: "Privacy Policy Framework | StakePesa",
};

export default function PrivacyPage() {
  const sections = [
    { id: "p1", title: "1. Policy Scope and Agreement" },
    { id: "p2", title: "2. Information Architecture" },
    { id: "p3", title: "3. Cryptographic and Financial Data" },
    { id: "p4", title: "4. Permitted Disclosure and Aggregation" },
    { id: "p5", title: "5. State Surveillance and Compliance" },
    { id: "p6", title: "6. Data Rentention Lifecycles" },
    { id: "p7", title: "7. Cookie Mechanics & Telemetry" },
    { id: "p8", title: "8. User DSR Rights (DPA/GDPR)" },
    { id: "p9", title: "9. Exemption from Third-Party Breach" },
  ];

  return (
    <LegalLayout
      title="StakePesa Privacy Framework"
      lastUpdated="April 14, 2026"
      sections={sections}
    >
      <section id="p1">
        <h2>1. Policy Scope and Irrevocable Agreement</h2>
        <p>
          This Data Protection and Privacy Framework ("Policy") establishes the exhaustive ruleset for how StakePesa ("we", "our") ingests, encrypts, analyzes, transacts, and archives personal data. By accessing the Platform, you confer explicit, informed, and irrevocable consent to the data practices described herein, satisfying the threshold requirements of the Kenya Data Protection Act, 2019 (DPA) and providing aligned protections matching the GDPR.
        </p>
      </section>

      <section id="p2">
        <h2>2. Data Information Architecture</h2>
        <p>
          <strong>2.1 Volitional Data.</strong> We collect exact identifiers inputted by you, including but not limited to Legal Name, Email Address, and Phone Number (used primarily for KYC and M-Pesa programmatic linking).
        </p>
        <p>
          <strong>2.2 Automated Telemetry.</strong> Interaction with the Platform automatically triggers telemetry collection. This includes IP Address vectors, User-Agent strings, browser fingerprints, geolocation metadata (derived or explicit), session duration mapping, and behavioral clickstream anomalies. We use this telemetry to fiercely defend the platform against synthetic traffic, botnets, and multi-accounting exploit rings.
        </p>
      </section>

      <section id="p3">
        <h2>3. Cryptographic and Financial Data Handling</h2>
        <p>
          Your financial fluidity on the Platform requires intimate linkage with external gateways (e.g., Safaricom M-Pesa, IntaSend). StakePesa <strong>does not</strong> store plaintext passwords or banking PINs. We store cryptographic hashes, payment transaction idempotency keys, receipt IDs, and ledger balances. You acknowledge that financial data parsed through APIs rests outside of our exclusive sovereign control, and is subject to the security physics of our gateway partners.
        </p>
      </section>

      <section id="p4">
        <h2>4. Permitted Disclosure and Aggregation Rights</h2>
        <p>
          <strong>4.1 Corporate Utilization.</strong> We categorically do not sell your unhashed contact data to third-party ad brokers. However, StakePesa reserves the right to anonymize, hash, and aggregate your historical challenge behavior and volumetric financial data. This sanitized data becomes the sole proprietary asset of StakePesa, to be used for algorithmic training, marketing broadsheets, or sold to institutional research sectors.
        </p>
        <p>
          <strong>4.2 Essential Third-Parties.</strong> We disclose data dynamically to cloud hosts (AWS, Vercel), email delivery grids (Resend), and risk-management vendors. These disclosures are bound by stringent Standard Contractual Clauses (SCCs).
        </p>
      </section>

      <section id="p5">
        <h2>5. State Surveillance and Compliance Directives</h2>
        <p>
          StakePesa cooperates intimately with the Republic of Kenya's law enforcement agencies, the Financial Reporting Centre (FRC), and the Office of the Data Protection Commissioner (ODPC). <strong>We waive your notification rights</strong> if served with a valid court order, subpoena, or a lawful secret directive investigating major criminal activity, terrorism financing, or platform fraud. We will hand over IP logs, payment ledgers, and communication histories to the state when legally forced to do so.
        </p>
      </section>

      <section id="p6">
        <h2>6. Data Retention Lifecycles</h2>
        <p>
          Operational metadata is retained dynamically to serve account needs. However, in strict observance of Kenyan financial reporting and tax obligations, complete transactional records, deposit histories, and KYC metadata are hard-locked and archived for a minimum statutory period of seven (7) years—even upon the explicit execution of an account deletion request by a user.
        </p>
      </section>

      <section id="p7">
        <h2>7. Cookie Mechanics and Tracking Telemetry</h2>
        <p>
          Our application necessitates the deployment of persistent and session-based cookies, local storage fragments, and JWT tokens to anchor authenticated state. You possess the browser-level capacity to annihilate these trackers; however, executing such a blockade will intentionally degrade the logic of the application, rendering logins broken and escrow interactions impossible. Your continued traversal of the Platform serves as affirmative consent to our storage technologies.
        </p>
      </section>

      <section id="p8">
        <h2>8. Data Subject Rights (DSR) & Limitations</h2>
        <p>
          Pursuant to the Kenyan DPA, you ostensibly maintain the right to query (Access), patch (Rectification), extract (Portability), or obliterate (Erasure) your data. You may lodge these complex requests via our designated feedback vectors or legal email. 
        </p>
        <p>
          <strong>Notice of Limitation:</strong> Your "Right to be Forgotten" is strictly superseded by our mandatory seven-year financial retention mandates (Clause 6), Anti-Money Laundering protocol, and our right to retain data mathematically necessary to enforce permanent account bans (i.e. retaining a hashed phone number to prevent banned users from reincarnating).
        </p>
      </section>

      <section id="p9">
        <h2>9. Comprehensive Exemption from Third-Party Breach</h2>
        <p>
          StakePesa utilizes industry-best-practice encryptions (TLS 1.3, AES-256 for resting data). Nevertheless, the cyber domain is inherently precarious. Should a state-sponsored attack, zero-day exploit, or downstream vendor breach compromise your data, you explicitly agree that StakePesa shall not be held liable for compensatory or punitive damages stemming from said catastrophic breach, provided StakePesa acted without documented willful negligence.
        </p>
      </section>
    </LegalLayout>
  );
}
