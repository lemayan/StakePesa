import nodemailer from "nodemailer";

const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,       // your-email@gmail.com
        pass: process.env.GMAIL_APP_PASSWORD, // 16-char app password
    },
});

export const sendVerificationEmail = async (email: string, token: string) => {
    const confirmLink = `${domain}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    console.log(`\n[DEV] Verification email for ${email}`);
    console.log(`Link: ${confirmLink}\n`);

    try {
        await transporter.sendMail({
            from: `"Stake Pesa" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: "Verify your email — Stake Pesa",
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="420" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:#0a0a0a;padding:28px 32px;">
          <span style="color:#22c55e;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Stake Pesa</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a0a0a;">Verify your email</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
            Click the button below to activate your Stake Pesa account. This link expires in 1 hour.
          </p>
          <a href="${confirmLink}" style="display:inline-block;background:#22c55e;color:#ffffff;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">
            Verify Email
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
            If you didn't create a Stake Pesa account, you can safely ignore this email.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #f0f0f0;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} Stake Pesa. Nairobi, Kenya.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });
    } catch (error) {
        console.error("Failed to send email:", error);
    }
};
