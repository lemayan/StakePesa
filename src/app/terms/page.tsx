import { LegalLayout } from "@/components/sections/legal-layout";

export const metadata = {
  title: "Comprehensive Terms of Service | StakePesa",
};

export default function TermsPage() {
  const sections = [
    { id: "s1", title: "1. Acceptance of Terms" },
    { id: "s2", title: "2. Platform Definition" },
    { id: "s3", title: "3. Assumption of Risk" },
    { id: "s4", title: "4. Escrow & Third-Party Risks" },
    { id: "s5", title: "5. Intellectual Property" },
    { id: "s6", title: "6. Indemnification" },
    { id: "s7", title: "7. Binding Arbitration" },
    { id: "s8", title: "8. Termination Rights" },
    { id: "s9", title: "9. Miscellaneous" },
  ];

  return (
    <LegalLayout
      title="StakePesa Terms of Service"
      lastUpdated="April 14, 2026"
      sections={sections}
    >
      <section id="s1">
        <h2>1. Acceptance of Terms</h2>
        <p>
          These Comprehensive Terms of Service (the "Terms") represent a legally binding agreement between you ("User," "you," or "your") and StakePesa ("Company," "we," "us," or "our"). By accessing the StakePesa website, mobile interface, or using any of our applications or API services (collectively, the "Platform"), you affirmatively accept these Terms in their entirety. 
        </p>
        <p>
          If you do not agree to every clause, disclaimer, and waiver enclosed herein, you are expressly prohibited from utilizing the Platform. These Terms govern all deposits, withdrawals, challenge formations, and interactions executed within StakePesa. We reserve the unequivocal right to modify, amend, or replace these Terms at our sole discretion at any time. Continued use of the Platform subsequent to such modifications constitutes your irrevocable acceptance of the revised Terms.
        </p>
      </section>

      <section id="s2">
        <h2>2. Platform Definition and Limitation of Role</h2>
        <p>
          <strong>2.1 Non-Fiduciary Technology Provider.</strong> StakePesa operates strictly as a peer-to-peer technology interface designed to facilitate conditional tracking and resolution of personal challenges. At no point does StakePesa act as a fiduciary, investment advisor, broker, legal representative, or licensed traditional gaming operator. We merely provide the software layer facilitating inter-party agreements.
        </p>
        <p>
          <strong>2.2 No Guarantee of Resolution.</strong> You acknowledge that all challenges created on the Platform are entered into voluntarily. We do not guarantee the honesty, integrity, or capability of any other user on the Platform. The Platform is provided on an "AS IS" and "AS AVAILABLE" basis, devoid of warranties of any kind, whether express, statutory, or implied.
        </p>
      </section>

      <section id="s3">
        <h2>3. Assumption of Risk and Financial Loss</h2>
        <p>
          <strong>3.1 Complete Asset Risk.</strong> Engaging in peer escrow challenges carries inherent financial risk, up to and including the total loss of deposited stakes. You expressly assume all risks associated with participation. StakePesa holds absolutely no liability for capital lost due to unfavorable challenge outcomes, disputes initiated by other users, or user error in challenge creation.
        </p>
        <p>
          <strong>3.2 Exculpation from Hacks and Exploits.</strong> While we implement commercial-grade encryption and security measures, no system is impenetrable. To the maximum extent permitted by applicable law, you waive any right to pursue damages against StakePesa for loss of funds resulting from unauthorized access, cyber-attacks, algorithmic exploitation, or systemic platform failure, barring proven gross negligence.
        </p>
      </section>

      <section id="s4">
        <h2>4. Escrow Operations and Third-Party Payment Systems</h2>
        <p>
          <strong>4.1 M-Pesa and Gateway Outages.</strong> StakePesa utilizes third-party infrastructure (e.g., Safaricom M-Pesa, IntaSend, AWS) to process payments and host ledgers. You acknowledge that StakePesa exercises zero control over the uptime, speed, or reliability of these third-party integrations. We are completely indemnified and exculpated from any liabilities stemming from telecom outages, delayed crediting, failed withdrawals, gateway insolvency, or banking freezes.
        </p>
        <p>
          <strong>4.2 Fund Confiscation and AML.</strong> In compliance with the Kenya Proceeds of Crime and Anti-Money Laundering Act (POCAMLA) and international sanctions, we reserve the right to indefinitely freeze or report funds if we harbor reasonable suspicion of fraud, money laundering, or illicit activity. Suspended funds will not be refunded or released until complete regulatory clearance is achieved.
        </p>
      </section>

      <section id="s5">
        <h2>5. Intellectual Property and User Content</h2>
        <p>
          StakePesa retains full ownership of its trademarks, source code, visual interfaces, and proprietary routing algorithms. By utilizing the Platform, you grant StakePesa a perpetual, royalty-free, worldwide license to use, display, and analyze any challenge metadata, feedback, or text you input into the system for the purpose of operating and improving the service. You may not reverse engineer, scrape, or commercially exploit any subset of the Platform without explicit written consent.
        </p>
      </section>

      <section id="s6">
        <h2>6. Indemnification and Hold Harmless</h2>
        <p>
          You agree to aggressively defend, indemnify, and hold StakePesa, its founders, directors, affiliates, and contractors entirely harmless from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt (including but not limited to attorney's fees) arising from: (a) your localized violation of these Terms; (b) your violation of any third-party right including privacy or intellectual property; (c) your violation of underlying behavioral laws in your jurisdiction; or (d) any dispute forged between you and another user regarding a challenge outcome.
        </p>
      </section>

      <section id="s7">
        <h2>7. Binding Arbitration and Class Action Waiver</h2>
        <p>
          <strong>7.1 Arbitration Pact.</strong> Any controversy or claim arising out of or relating to these Terms, or the breach thereof, shall be settled strictly by binding arbitration administered by the Nairobi Centre for International Arbitration (NCIA) under its prevailing rules. The tribunal shall consist of a single arbitrator. The seat of the arbitration shall be Nairobi, Kenya. You explicitly waive the right to litigate disputes in a traditional court of law before a judge or jury.
        </p>
        <p>
          <strong>7.2 Class Action Waiver.</strong> YOU AND STAKEPESA AGREE THAT ANY PROCEEDING TO RESOLVE DISPUTES WILL BE CONDUCTED SOLELY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION. If this specific waiver is found to be unenforceable, the entirety of this arbitration clause shall be rendered null and void.
        </p>
      </section>

      <section id="s8">
        <h2>8. Absolute Right of Termination and Restriction</h2>
        <p>
          We retain the absolute and unchallengeable right to suspend, terminate, or ban your access to the Platform—including the immediate liquidation and forfeiture of disputed escrows—at our sole discretion, without liability, and without prior notice, should we determine you pose a security, legal, or operational risk to StakePesa or its community, or if you violate any clause of these Terms.
        </p>
      </section>

      <section id="s9">
        <h2>9. Miscellaneous and Severability</h2>
        <p>
          If any provision of these Terms is deemed unlawful or unenforceable by a tribunal of competent jurisdiction, that provision shall be severed to the minimum extent necessary, and the remaining provisions shall remain in full force and effect. These Terms constitute the entire agreement between you and StakePesa, superseding all prior communications or understandings.
        </p>
      </section>
    </LegalLayout>
  );
}
