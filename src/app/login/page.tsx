"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/ui/logo";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { loginAction, resendVerificationAction } from "@/actions/auth";
import { motion, AnimatePresence } from "framer-motion";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<string | null>(null);
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Read URL-based messages on mount
  useEffect(() => {
    if (params.get("verified") === "true") {
      setInfo("Email verified! You can now sign in.");
    }
    if (params.get("reason") === "email_exists") {
      setInfo("This email is already registered. Please sign in.");
    }
    const err = params.get("error");
    if (err === "OAuthAccountNotLinked") {
      setError("This email is already registered with a different sign-in method.");
    }
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorType(null);
    setInfo("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("email", email);
      fd.set("password", password);
      fd.set("agreeTerms", agreeTerms ? "true" : "false");
      const res = await loginAction(fd);
      if (res?.error) {
        setError(res.error);
        setErrorType(res.type ?? null);
      }
      // If no error returned, loginAction triggered a redirect to /dashboard
    } catch {
      // NEXT_REDIRECT throws — this is expected on success
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Enter your email above, then click resend.");
      return;
    }
    setResending(true);
    const res = await resendVerificationAction(email);
    if (res.success) {
      setInfo(res.success);
      setError("");
      setErrorType(null);
    } else {
      setError(res.error ?? "Failed to resend.");
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-5 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg transition-colors mb-6"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to home
        </Link>

        {/* Logo + heading */}
        <div>
          <Link href="/" className="inline-block">
            <Logo iconSize={44} textSize="text-[26px]" />
          </Link>
          <h1 className="text-[26px] sm:text-[28px] font-bold mt-8">Log in</h1>
          <p className="text-[14px] sm:text-[15px] text-fg-secondary mt-1">
            Access your markets and settle bets
          </p>
        </div>

        {/* Google sign-in */}
        <button
          onClick={() => {
            if (!agreeTerms) {
              setError("You must agree to the Terms and Privacy Policy to continue.");
              return;
            }
            signIn("google", { callbackUrl: "/dashboard" });
          }}
          className="w-full h-11 text-[15px] border border-line rounded-lg hover:bg-bg-above transition-all duration-200 flex items-center justify-center gap-2.5 font-medium"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-line" />
          <span className="text-[12px] font-mono text-fg-muted uppercase tracking-wider">
            or sign in with email
          </span>
          <div className="flex-1 h-px bg-line" />
        </div>

        {/* Messages */}
        <AnimatePresence mode="wait">
          {info && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-[14px] text-green bg-green/5 px-4 py-2.5 border border-green/20 rounded-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {info}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="text-[14px] text-red bg-red-dim px-4 py-2.5 border border-red/20 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span>{error}</span>
                </div>
                {errorType === "not_verified" && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="mt-2 text-[13px] text-green underline hover:no-underline disabled:opacity-50"
                  >
                    {resending ? "Sending…" : "Resend verification email"}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-4 text-[15px] bg-transparent border border-line rounded-lg focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all duration-200"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider">
                Password
              </label>
              <a href="#" className="text-[12px] text-green hover:underline">
                Forgot?
              </a>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-11 px-4 text-[15px] bg-transparent border border-line rounded-lg focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all duration-200"
              placeholder="Enter your password"
            />
          </div>

          <label className="flex items-start gap-2 text-[12px] text-fg-secondary">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              required
              className="mt-0.5"
            />
            <span>
              I agree to the <Link href="/terms" className="text-green hover:underline">Terms</Link> and <Link href="/privacy" className="text-green hover:underline">Privacy Policy</Link>.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !agreeTerms}
            className="w-full h-11 text-[15px] font-semibold bg-green text-white rounded-lg hover:opacity-90 transition-all duration-200 disabled:opacity-50 mt-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Bottom link */}
        <p className="text-[14px] text-fg-muted text-center pt-2">
          No account?{" "}
          <Link href="/signup" className="text-green font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-green border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
