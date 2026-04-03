"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/ui/logo";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { verifyEmailAction, resendVerificationAction } from "@/actions/auth";

type Status = "checking" | "success" | "error" | "waiting";

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const emailParam = params.get("email");

  const [status, setStatus] = useState<Status>(token ? "checking" : "waiting");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  const verify = useCallback(async () => {
    if (!token) return;
    setStatus("checking");
    const res = await verifyEmailAction(token);
    if (res.success) {
      setStatus("success");
      setMessage("Email verified successfully!");
      // Auto-redirect to login after 2.5s
      setTimeout(() => router.push("/login?verified=true"), 2500);
    } else {
      setStatus("error");
      setMessage(res.error ?? "Verification failed.");
    }
  }, [token, router]);

  useEffect(() => {
    if (token) verify();
  }, [token, verify]);

  const handleResend = async () => {
    const email = emailParam;
    if (!email) {
      setResendMsg("No email address provided.");
      return;
    }
    setResending(true);
    setResendMsg("");
    const res = await resendVerificationAction(email);
    setResendMsg(res.success ?? res.error ?? "");
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm text-center space-y-5"
      >
        <Link href="/" className="inline-block">
          <div className="flex justify-center">
            <Logo iconSize={48} textSize="text-[28px]" />
          </div>
        </Link>

        {/* ── Checking token ── */}
        {status === "checking" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 pt-4"
          >
            <div className="mx-auto w-10 h-10 rounded-full border-2 border-green border-t-transparent animate-spin" />
            <p className="text-[15px] text-fg-secondary">Verifying your email…</p>
          </motion.div>
        )}

        {/* ── Success ── */}
        {status === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 pt-4"
          >
            <div className="mx-auto w-14 h-14 rounded-full bg-green/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-[24px] font-bold">{message}</h1>
            <p className="text-[14px] text-fg-secondary">
              Redirecting you to login…
            </p>
            <Link
              href="/login?verified=true"
              className="inline-flex h-10 px-5 text-[14px] font-medium bg-green text-white rounded-lg hover:opacity-90 transition-all items-center"
            >
              Go to login now
            </Link>
          </motion.div>
        )}

        {/* ── Error ── */}
        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 pt-4"
          >
            <div className="mx-auto w-14 h-14 rounded-full bg-red/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-[24px] font-bold">Verification failed</h1>
            <p className="text-[14px] text-fg-secondary">{message}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
              {emailParam && (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="h-10 px-5 text-[14px] font-medium bg-green text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {resending ? "Sending…" : "Resend verification"}
                </button>
              )}
              <Link
                href="/login"
                className="h-10 px-5 text-[14px] font-medium border border-line rounded-lg hover:bg-bg-above transition-all flex items-center justify-center"
              >
                Back to login
              </Link>
            </div>
            {resendMsg && (
              <p className="text-[13px] text-fg-muted">{resendMsg}</p>
            )}
          </motion.div>
        )}

        {/* ── Waiting (just signed up, no token in URL) ── */}
        {status === "waiting" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 pt-4"
          >
            <div className="mx-auto w-14 h-14 rounded-full bg-green/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 className="text-[24px] font-bold">Check your email</h1>
            <p className="text-[15px] text-fg-secondary">
              We sent a verification link to{" "}
              {emailParam ? (
                <span className="text-fg font-medium">{emailParam}</span>
              ) : (
                "your inbox"
              )}
              . Click it to activate your account.
            </p>
            <p className="text-[13px] text-fg-muted">
              Didn&apos;t get an email? Check your spam folder.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
              {emailParam && (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="h-10 px-5 text-[14px] font-medium border border-line rounded-lg hover:bg-bg-above transition-all disabled:opacity-50"
                >
                  {resending ? "Sending…" : "Resend email"}
                </button>
              )}
              <Link
                href="/login"
                className="h-10 px-5 text-[14px] font-medium border border-line rounded-lg hover:bg-bg-above transition-all flex items-center justify-center"
              >
                Back to login
              </Link>
            </div>
            {resendMsg && (
              <p className="text-[13px] text-green font-medium">{resendMsg}</p>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-green border-t-transparent animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
