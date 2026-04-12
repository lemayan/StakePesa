import nodemailer from "nodemailer";

const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const year = new Date().getFullYear();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

// ─────────────────────────────────────────────────────────────
// SHARED HTML HELPERS
// ─────────────────────────────────────────────────────────────

function emailWrapper(bodyContent: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">

        <!-- Header -->
        <tr><td style="background:#0d0d0d;padding:24px 32px;border-bottom:1px solid #2a2a2a;">
          <span style="color:#22c55e;font-size:22px;font-weight:800;letter-spacing:-0.5px;">StakePesa</span>
        </td></tr>

        <!-- Body -->
        ${bodyContent}

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a2a;">
          <p style="margin:0;font-size:12px;color:#4b5563;">&copy; ${year} StakePesa. Nairobi, Kenya.</p>
          <p style="margin:6px 0 0;font-size:12px;">
            <a href="${domain}/dashboard" style="color:#22c55e;text-decoration:none;">Manage email preferences</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
    return `<a href="${href}" style="display:inline-block;background:#22c55e;color:#ffffff;font-size:15px;font-weight:700;padding:13px 28px;border-radius:10px;text-decoration:none;letter-spacing:-0.2px;">${label}</a>`;
}

function infoCard(rows: Array<[string, string]>): string {
    const rowsHtml = rows
        .map(
            ([label, value]) =>
                `<tr>
          <td style="padding:8px 0;font-size:13px;color:#9ca3af;">${label}</td>
          <td style="padding:8px 0;font-size:13px;color:#e5e7eb;font-weight:600;text-align:right;">${value}</td>
        </tr>`
        )
        .join("");
    return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:10px;padding:16px 20px;border:1px solid #2a2a2a;">${rowsHtml}</table>`;
}

function formatKes(cents: number): string {
    return `KES ${(cents / 100).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

// ─────────────────────────────────────────────────────────────
// 0. WELCOME EMAIL (sent immediately after signup)
// ─────────────────────────────────────────────────────────────

export const sendWelcomeEmail = async (
    email: string,
    username: string
): Promise<void> => {
    const dashboardUrl = `${domain}/dashboard`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Welcome to StakePesa</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

    /* ── Keyframe animations ── */
    @keyframes bounce {
      0%, 100% { transform: translateY(0) scale(1); }
      20%       { transform: translateY(-18px) scale(1.08); }
      40%       { transform: translateY(-8px) scale(1.03); }
      60%       { transform: translateY(-14px) scale(1.06); }
      80%       { transform: translateY(-4px) scale(1.01); }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
    @keyframes pulse-ring {
      0%   { box-shadow: 0 0 0 0   rgba(34,197,94,0.5), 0 0 0 0   rgba(34,197,94,0.3); }
      70%  { box-shadow: 0 0 0 16px rgba(34,197,94,0),   0 0 0 30px rgba(34,197,94,0); }
      100% { box-shadow: 0 0 0 0   rgba(34,197,94,0),   0 0 0 0   rgba(34,197,94,0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(-2deg); }
      50%       { transform: translateY(-8px) rotate(2deg); }
    }
    @keyframes greenGlow {
      0%, 100% { text-shadow: 0 0 20px rgba(34,197,94,0.4); }
      50%       { text-shadow: 0 0 40px rgba(34,197,94,0.9), 0 0 60px rgba(34,197,94,0.4); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    .logo-wrap  { animation: bounce 1.4s cubic-bezier(0.36,0.07,0.19,0.97) 0.3s both; }
    .headline   { animation: fadeUp 0.7s ease 0.9s both; }
    .subline    { animation: fadeUp 0.7s ease 1.05s both; }
    .shimmer-text {
      background: linear-gradient(90deg, #22c55e 0%, #86efac 40%, #22c55e 60%, #4ade80 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 2.5s linear infinite 1.2s;
    }
    .cta-btn {
      animation: fadeUp 0.7s ease 1.4s both;
      display: inline-block;
      background: #22c55e;
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 700;
      padding: 14px 36px;
      border-radius: 12px;
      text-decoration: none;
      letter-spacing: -0.2px;
      box-shadow: 0 0 0 0 rgba(34,197,94,0.5);
      animation: fadeUp 0.7s ease 1.4s both, pulse-ring 2s ease-out 2s infinite;
    }
    .feat-1 { animation: slideIn 0.5s ease 1.6s both; }
    .feat-2 { animation: slideIn 0.5s ease 1.75s both; }
    .feat-3 { animation: slideIn 0.5s ease 1.9s both; }
    .coin    { animation: float 3s ease-in-out 1s infinite; display: inline-block; }
  </style>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <!-- outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:#0a0a0a;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="border-radius:20px;overflow:hidden;border:1px solid #1f2937;">

        <!-- ── HERO HEADER ── -->
        <tr><td style="background:linear-gradient(160deg,#0d1a10 0%,#0f2318 50%,#0d1a10 100%);padding:48px 32px 40px;text-align:center;border-bottom:1px solid #1f2937;">

          <!-- Bouncing logo badge -->
          <div class="logo-wrap" style="margin:0 auto 24px;">
            <div style="
              width:80px;height:80px;margin:0 auto;
              background:linear-gradient(135deg,#15803d,#22c55e);
              border-radius:24px;
              display:flex;align-items:center;justify-content:center;
              box-shadow:0 8px 32px rgba(34,197,94,0.4),0 0 0 1px rgba(34,197,94,0.2);
              font-size:36px;font-weight:900;color:#fff;
              line-height:80px;text-align:center;
            ">S</div>
          </div>

          <!-- Brand name shimmer -->
          <h1 class="shimmer-text" style="margin:0 0 6px;font-size:32px;font-weight:900;letter-spacing:-1px;">
            StakePesa
          </h1>
          <p style="margin:0;font-size:12px;color:#4b5563;font-weight:500;letter-spacing:2px;text-transform:uppercase;">
            Kenya's Premier P2P Prediction Platform
          </p>
        </td></tr>

        <!-- ── WELCOME BODY ── -->
        <tr><td style="background:#111111;padding:40px 32px;">

          <!-- Headline -->
          <h2 class="headline" style="margin:0 0 12px;font-size:26px;font-weight:800;color:#f9fafb;text-align:center;line-height:1.2;">
            Welcome aboard, <span style="color:#22c55e;">${username}</span>! <span class="coin">🪙</span>
          </h2>
          <p class="subline" style="margin:0 0 32px;font-size:15px;color:#9ca3af;text-align:center;line-height:1.7;">
            Your account is ready. You're now part of the fastest-growing<br/>
            peer-to-peer prediction community in Kenya.
          </p>

          <!-- CTA button -->
          <div style="text-align:center;margin-bottom:36px;">
            <a href="${dashboardUrl}" class="cta-btn">
              Start Predicting →
            </a>
          </div>

          <!-- Feature cards -->
          <table width="100%" cellpadding="0" cellspacing="0">

            <tr class="feat-1"><td style="padding:0 0 12px;">
              <div style="background:#0d0d0d;border:1px solid #1f2937;border-radius:12px;padding:16px 20px;display:flex;align-items:flex-start;gap:14px;">
                <div style="width:40px;height:40px;min-width:40px;background:#14532d20;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;line-height:40px;text-align:center;">🎯</div>
                <div>
                  <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#f9fafb;">Create Private Challenges</p>
                  <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Bet one-on-one with friends on any outcome — sports, politics, lifestyle, anything.</p>
                </div>
              </div>
            </td></tr>

            <tr class="feat-2"><td style="padding:0 0 12px;">
              <div style="background:#0d0d0d;border:1px solid #1f2937;border-radius:12px;padding:16px 20px;display:flex;align-items:flex-start;gap:14px;">
                <div style="width:40px;height:40px;min-width:40px;background:#14532d20;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;line-height:40px;text-align:center;">💰</div>
                <div>
                  <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#f9fafb;">Instant M-Pesa Payouts</p>
                  <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Deposit and withdraw with M-Pesa. Your winnings hit your wallet instantly.</p>
                </div>
              </div>
            </td></tr>

            <tr class="feat-3"><td>
              <div style="background:#0d0d0d;border:1px solid #1f2937;border-radius:12px;padding:16px 20px;display:flex;align-items:flex-start;gap:14px;">
                <div style="width:40px;height:40px;min-width:40px;background:#14532d20;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;line-height:40px;text-align:center;">🏆</div>
                <div>
                  <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#f9fafb;">Climb the Leaderboard</p>
                  <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Compete against Kenya's best predictors and claim your spot at the top.</p>
                </div>
              </div>
            </td></tr>

          </table>

          <!-- Divider tip -->
          <div style="margin-top:28px;padding:16px 20px;background:#0a1a0d;border:1px solid #166534;border-radius:12px;">
            <p style="margin:0;font-size:13px;color:#86efac;font-weight:600;">💡 Pro tip:</p>
            <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">Verify your M-Pesa number first to unlock deposits and challenge invitations.</p>
          </div>

        </td></tr>

        <!-- ── FOOTER ── -->
        <tr><td style="background:#0d0d0d;padding:24px 32px;border-top:1px solid #1f2937;">
          <p style="margin:0 0 6px;font-size:12px;color:#374151;text-align:center;">
            &copy; ${year} StakePesa. Nairobi, Kenya.
          </p>
          <p style="margin:0;font-size:12px;text-align:center;">
            <a href="${dashboardUrl}" style="color:#22c55e;text-decoration:none;">Open Dashboard</a>
            &nbsp;·&nbsp;
            <a href="${domain}" style="color:#4b5563;text-decoration:none;">Visit Website</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
        await transporter.sendMail({
            from: `"StakePesa" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: `🎉 Welcome to StakePesa, ${username}! Your account is ready`,
            html,
        });
        console.log(`[mail] Welcome email sent to ${email}`);
    } catch (error) {
        console.error("[mail] Failed to send welcome email:", error);
    }
};

// ─────────────────────────────────────────────────────────────
// 1. EMAIL VERIFICATION
// ─────────────────────────────────────────────────────────────

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
    const confirmLink = `${domain}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    console.log(`\n[DEV] Verification email for ${email}`);
    console.log(`Link: ${confirmLink}\n`);

    const body = `
      <tr><td style="padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:52px;height:52px;background:#22c55e20;border-radius:50%;line-height:52px;font-size:24px;text-align:center;">✉️</div>
        </div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f9fafb;text-align:center;">Verify your email</h1>
        <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;line-height:1.6;text-align:center;">
          Click the button below to activate your StakePesa account.<br/>This link expires in <strong style="color:#e5e7eb;">1 hour</strong>.
        </p>
        <div style="text-align:center;margin-bottom:28px;">
          ${ctaButton(confirmLink, "Verify My Email")}
        </div>
        <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;line-height:1.6;">
          If you didn't create a StakePesa account, you can safely ignore this email.
        </p>
      </td></tr>`;

    try {
        await transporter.sendMail({
            from: `"StakePesa" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: "Verify your email — StakePesa",
            html: emailWrapper(body),
        });
    } catch (error) {
        console.error("[mail] Failed to send verification email:", error);
    }
};

// ─────────────────────────────────────────────────────────────
// 2. CHALLENGE CREATED (sent to creator)
// ─────────────────────────────────────────────────────────────

export interface ChallengeEmailData {
    id: string;
    title: string;
    description?: string | null;
    endDate: string;
    stakeAmountCents: number;
    totalPoolCents: number;
    participantCount: number;
    fundingMode: string;
}

export const sendChallengeCreatedEmail = async (
    creatorEmail: string,
    creatorName: string,
    challenge: ChallengeEmailData
): Promise<void> => {
    const challengeUrl = `${domain}/dashboard/challenges/${challenge.id}`;
    const endFormatted = new Date(challenge.endDate).toLocaleDateString("en-KE", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const body = `
      <tr><td style="padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:56px;height:56px;background:#22c55e20;border-radius:50%;line-height:56px;font-size:28px;text-align:center;">✅</div>
        </div>
        <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#f9fafb;text-align:center;">Challenge Created!</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;text-align:center;">
          Hey <strong style="color:#e5e7eb;">${creatorName}</strong>, your challenge is live and invitations have been sent.
        </p>

        <div style="margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Challenge</p>
          <p style="margin:0;font-size:17px;font-weight:700;color:#f9fafb;">${challenge.title}</p>
          ${challenge.description ? `<p style="margin:6px 0 0;font-size:13px;color:#9ca3af;">${challenge.description}</p>` : ""}
        </div>

        ${infoCard([
            ["Your stake", formatKes(challenge.stakeAmountCents)],
            ["Total pool", formatKes(challenge.totalPoolCents)],
            ["Participants", String(challenge.participantCount)],
            ["Ends", endFormatted],
            ["Funding", challenge.fundingMode === "CREATOR_FUNDED" ? "Creator funded" : "Split between participants"],
        ])}

        <div style="text-align:center;margin-top:28px;">
          ${ctaButton(challengeUrl, "View Challenge")}
        </div>
      </td></tr>`;

    try {
        await transporter.sendMail({
            from: `"StakePesa" <${process.env.GMAIL_USER}>`,
            to: creatorEmail,
            subject: `✅ Challenge created: "${challenge.title}" — StakePesa`,
            html: emailWrapper(body),
        });
    } catch (error) {
        console.error("[mail] Failed to send challenge created email:", error);
    }
};

// ─────────────────────────────────────────────────────────────
// 3. CHALLENGE INVITATION (sent to each invitee)
// ─────────────────────────────────────────────────────────────

export const sendChallengeInvitationEmail = async (
    inviteeEmail: string,
    inviterName: string,
    challenge: ChallengeEmailData,
    invitationId: string,
    stakeAmountCents: number
): Promise<void> => {
    const acceptUrl = `${domain}/dashboard`;
    const endFormatted = new Date(challenge.endDate).toLocaleDateString("en-KE", {
        day: "numeric", month: "long", year: "numeric",
    });

    const body = `
      <tr><td style="padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:56px;height:56px;background:#3b82f620;border-radius:50%;line-height:56px;font-size:28px;text-align:center;">🎯</div>
        </div>
        <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#f9fafb;text-align:center;">You're Invited!</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;text-align:center;">
          <strong style="color:#e5e7eb;">${inviterName}</strong> has challenged you to a bet on StakePesa.
        </p>

        <div style="margin-bottom:24px;background:#111827;border:1px solid #2a2a2a;border-radius:10px;padding:20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Challenge</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#f9fafb;">${challenge.title}</p>
          ${challenge.description ? `<p style="margin:8px 0 0;font-size:13px;color:#9ca3af;">${challenge.description}</p>` : ""}
        </div>

        ${infoCard([
            ["Your required stake", formatKes(stakeAmountCents)],
            ["Total pool value", formatKes(challenge.totalPoolCents)],
            ["Challenge ends", endFormatted],
        ])}

        <div style="margin:24px 0;background:#14532d20;border:1px solid #166534;border-radius:10px;padding:16px 20px;">
          <p style="margin:0;font-size:14px;color:#86efac;font-weight:600;">If you win:</p>
          <p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">You'll receive a share of the <strong style="color:#22c55e;">${formatKes(challenge.totalPoolCents)}</strong> pot.</p>
        </div>

        <div style="text-align:center;margin-top:20px;">
          ${ctaButton(acceptUrl, "Accept Challenge →")}
        </div>
        <p style="margin:16px 0 0;font-size:12px;color:#6b7280;text-align:center;">
          Log in to StakePesa to accept or decline this invitation. Invitation ID: <code style="color:#9ca3af;">${invitationId.slice(0, 8)}</code>
        </p>
      </td></tr>`;

    try {
        await transporter.sendMail({
            from: `"StakePesa" <${process.env.GMAIL_USER}>`,
            to: inviteeEmail,
            subject: `🎯 ${inviterName} challenged you: "${challenge.title}" — StakePesa`,
            html: emailWrapper(body),
        });
    } catch (error) {
        console.error("[mail] Failed to send invitation email:", error);
    }
};

// ─────────────────────────────────────────────────────────────
// 4. INVITATION ACCEPTED (sent to creator)
// ─────────────────────────────────────────────────────────────

export const sendInvitationAcceptedEmail = async (
    creatorEmail: string,
    creatorName: string,
    acceptorName: string,
    challenge: Pick<ChallengeEmailData, "id" | "title" | "totalPoolCents">
): Promise<void> => {
    const challengeUrl = `${domain}/dashboard/challenges/${challenge.id}`;

    const body = `
      <tr><td style="padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:56px;height:56px;background:#22c55e20;border-radius:50%;line-height:56px;font-size:28px;text-align:center;">🤝</div>
        </div>
        <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#f9fafb;text-align:center;">Invitation Accepted!</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;text-align:center;">
          Hey <strong style="color:#e5e7eb;">${creatorName}</strong>, <strong style="color:#22c55e;">${acceptorName}</strong> just accepted your challenge invitation.
        </p>

        ${infoCard([
            ["Challenge", challenge.title],
            ["Pool value", formatKes(challenge.totalPoolCents)],
        ])}

        <div style="text-align:center;margin-top:28px;">
          ${ctaButton(challengeUrl, "Track Challenge")}
        </div>
      </td></tr>`;

    try {
        await transporter.sendMail({
            from: `"StakePesa" <${process.env.GMAIL_USER}>`,
            to: creatorEmail,
            subject: `🤝 ${acceptorName} accepted your challenge — StakePesa`,
            html: emailWrapper(body),
        });
    } catch (error) {
        console.error("[mail] Failed to send invitation accepted email:", error);
    }
};

// ─────────────────────────────────────────────────────────────
// 5. CHALLENGE NOW ACTIVE (sent to all participants)
// ─────────────────────────────────────────────────────────────

export const sendChallengeActiveEmail = async (
    participantEmail: string,
    participantName: string,
    challenge: Pick<ChallengeEmailData, "id" | "title" | "totalPoolCents" | "endDate">
): Promise<void> => {
    const challengeUrl = `${domain}/dashboard/challenges/${challenge.id}`;
    const endFormatted = new Date(challenge.endDate).toLocaleDateString("en-KE", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const body = `
      <tr><td style="padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:56px;height:56px;background:#f59e0b20;border-radius:50%;line-height:56px;font-size:28px;text-align:center;">🔥</div>
        </div>
        <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#f9fafb;text-align:center;">Challenge is Live!</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;text-align:center;">
          Hey <strong style="color:#e5e7eb;">${participantName}</strong>, all participants have joined. The challenge is now <strong style="color:#fbbf24;">ACTIVE</strong>.
        </p>

        ${infoCard([
            ["Challenge", challenge.title],
            ["Total pool", formatKes(challenge.totalPoolCents)],
            ["Ends", endFormatted],
        ])}

        <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;line-height:1.6;">
          Good luck! When the challenge ends, participants will verify the outcome.
        </p>
        <div style="text-align:center;margin-top:20px;">
          ${ctaButton(challengeUrl, "View Live Challenge")}
        </div>
      </td></tr>`;

    try {
        await transporter.sendMail({
            from: `"StakePesa" <${process.env.GMAIL_USER}>`,
            to: participantEmail,
            subject: `🔥 Challenge is now live: "${challenge.title}" — StakePesa`,
            html: emailWrapper(body),
        });
    } catch (error) {
        console.error("[mail] Failed to send challenge active email:", error);
    }
};

// ─────────────────────────────────────────────────────────────
// 6. CHALLENGE RESOLVED — WIN or LOSS
// ─────────────────────────────────────────────────────────────

export const sendChallengeResolvedEmail = async (
    participantEmail: string,
    participantName: string,
    challenge: Pick<ChallengeEmailData, "id" | "title" | "totalPoolCents">,
    didWin: boolean,
    payoutCents: number,
    resolutionNotes?: string | null
): Promise<void> => {
    const challengeUrl = `${domain}/dashboard/challenges/${challenge.id}`;

    const icon = didWin ? "🏆" : "💔";
    const headline = didWin ? "You Won!" : "Better luck next time";
    const iconBg = didWin ? "#22c55e20" : "#ef444420";
    const headlineColor = didWin ? "#22c55e" : "#f87171";
    const subtext = didWin
        ? `Congratulations <strong style="color:#e5e7eb;">${participantName}</strong> — your stake paid off!`
        : `Hey <strong style="color:#e5e7eb;">${participantName}</strong>, this one didn't go your way. Keep going!`;

    const payoutRow: Array<[string, string]> = didWin
        ? [["Your payout", `<span style="color:#22c55e;font-weight:700;">${formatKes(payoutCents)}</span>`]]
        : [];

    const body = `
      <tr><td style="padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:56px;height:56px;background:${iconBg};border-radius:50%;line-height:56px;font-size:28px;text-align:center;">${icon}</div>
        </div>
        <h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:${headlineColor};text-align:center;">${headline}</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;text-align:center;">${subtext}</p>

        ${infoCard([
            ["Challenge", challenge.title],
            ["Total pool", formatKes(challenge.totalPoolCents)],
            ...payoutRow,
            ...(resolutionNotes ? [["Resolution", resolutionNotes] as [string, string]] : []),
        ])}

        <div style="text-align:center;margin-top:28px;">
          ${ctaButton(challengeUrl, "View Results")}
        </div>
        ${didWin
            ? `<p style="margin:16px 0 0;font-size:13px;color:#9ca3af;text-align:center;">Your winnings have been credited to your StakePesa wallet. 🎉</p>`
            : `<p style="margin:16px 0 0;font-size:13px;color:#9ca3af;text-align:center;">Create a new challenge and try again — your next win is closer than you think.</p>`
        }
      </td></tr>`;

    try {
        await transporter.sendMail({
            from: `"StakePesa" <${process.env.GMAIL_USER}>`,
            to: participantEmail,
            subject: didWin
                ? `🏆 You won "${challenge.title}"! — StakePesa`
                : `Challenge resolved: "${challenge.title}" — StakePesa`,
            html: emailWrapper(body),
        });
    } catch (error) {
        console.error("[mail] Failed to send challenge resolved email:", error);
    }
};

// ─────────────────────────────────────────────────────────────
// 7. DISPUTE RAISED (sent to referee or creator)
// ─────────────────────────────────────────────────────────────

export const sendDisputeRaisedEmail = async (
    notifyEmail: string,
    notifyName: string,
    raisedByName: string,
    challenge: Pick<ChallengeEmailData, "id" | "title">,
    reason: string
): Promise<void> => {
    const challengeUrl = `${domain}/dashboard/challenges/${challenge.id}`;

    const body = `
      <tr><td style="padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:56px;height:56px;background:#f59e0b20;border-radius:50%;line-height:56px;font-size:28px;text-align:center;">⚠️</div>
        </div>
        <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#fbbf24;text-align:center;">Dispute Raised</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;text-align:center;">
          Hey <strong style="color:#e5e7eb;">${notifyName}</strong>, <strong style="color:#fbbf24;">${raisedByName}</strong> has raised a dispute on a challenge you need to review.
        </p>

        ${infoCard([
            ["Challenge", challenge.title],
            ["Disputed by", raisedByName],
        ])}

        <div style="margin:20px 0;background:#1c1007;border:1px solid #92400e;border-radius:10px;padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Reason</p>
          <p style="margin:0;font-size:14px;color:#fde68a;line-height:1.6;">"${reason}"</p>
        </div>

        <p style="margin:0 0 20px;font-size:13px;color:#9ca3af;text-align:center;line-height:1.6;">
          Please review the dispute and provide your resolution within <strong style="color:#e5e7eb;">7 days</strong> to avoid automatic forfeiture.
        </p>
        <div style="text-align:center;">
          ${ctaButton(challengeUrl, "Review Dispute →")}
        </div>
      </td></tr>`;

    try {
        await transporter.sendMail({
            from: `"StakePesa" <${process.env.GMAIL_USER}>`,
            to: notifyEmail,
            subject: `⚠️ Dispute raised on "${challenge.title}" — StakePesa`,
            html: emailWrapper(body),
        });
    } catch (error) {
        console.error("[mail] Failed to send dispute email:", error);
    }
};

// ─────────────────────────────────────────────────────────────
// 8. DEPOSIT CONFIRMED (sent after M-Pesa wallet top-up)
// ─────────────────────────────────────────────────────────────

export const sendDepositConfirmedEmail = async (
    userEmail: string,
    userName: string,
    amountCents: number,
    mpesaReceipt?: string | null
): Promise<void> => {
    const dashboardUrl = `${domain}/dashboard`;

    const body = `
      <tr><td style="padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;width:56px;height:56px;background:#22c55e20;border-radius:50%;line-height:56px;font-size:28px;text-align:center;">💰</div>
        </div>
        <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#f9fafb;text-align:center;">Deposit Confirmed!</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;text-align:center;">
          Hey <strong style="color:#e5e7eb;">${userName}</strong>, your M-Pesa deposit has been confirmed and credited to your wallet.
        </p>

        <div style="text-align:center;margin:0 0 24px;">
          <p style="margin:0;font-size:38px;font-weight:800;color:#22c55e;">${formatKes(amountCents)}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Credited to your StakePesa wallet</p>
        </div>

        ${infoCard([
            ...(mpesaReceipt ? [["M-Pesa receipt", mpesaReceipt] as [string, string]] : []),
            ["Status", '<span style="color:#22c55e;">✓ Confirmed</span>'],
        ])}

        <div style="text-align:center;margin-top:28px;">
          ${ctaButton(dashboardUrl, "Start Betting")}
        </div>
      </td></tr>`;

    try {
        await transporter.sendMail({
            from: `"StakePesa" <${process.env.GMAIL_USER}>`,
            to: userEmail,
            subject: `💰 ${formatKes(amountCents)} deposited to your StakePesa wallet`,
            html: emailWrapper(body),
        });
    } catch (error) {
        console.error("[mail] Failed to send deposit confirmed email:", error);
    }
};
