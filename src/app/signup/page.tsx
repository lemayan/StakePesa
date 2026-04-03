"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/ui/logo";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { signupAction } from "@/actions/auth";
import { motion } from "framer-motion";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("username", form.name);
      fd.set("email", form.email);
      fd.set("password", form.password);
      fd.set("agreeTerms", agreeTerms ? "true" : "false");
      const res = await signupAction(fd);
      if (res?.error) {
        // If email already registered → redirect to login page
        if (res.type === "email_exists") {
          router.push("/login?reason=email_exists");
          return;
        }
        setError(res.error);
      } else {
        // Pass email to verify page so resend works
        router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const u = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-5 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-5"
        >
          {/* Back link */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg transition-colors mb-6">
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
            <h1 className="text-[26px] sm:text-[28px] font-bold mt-8">Create account</h1>
            <p className="text-[14px] sm:text-[15px] text-fg-secondary mt-1">
              Start staking na mbogi yako
            </p>
          </div>

          {/* Google sign-up first */}
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
            <span className="text-[12px] font-mono text-fg-muted uppercase tracking-wider">or use email</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-3.5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[14px] text-red bg-red-dim px-4 py-2.5 border border-red/20 rounded-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </motion.div>
            )}

            {/* Name + Email side by side on larger screens */}
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={u("name")}
                  required
                  className="w-full h-11 px-4 text-[15px] bg-transparent border border-line rounded-lg focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all duration-200"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={u("email")}
                  required
                  className="w-full h-11 px-4 text-[15px] bg-transparent border border-line rounded-lg focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all duration-200"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={u("password")}
                required
                className="w-full h-11 px-4 text-[15px] bg-transparent border border-line rounded-lg focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all duration-200"
                placeholder="Min 8 chars, uppercase, number, symbol"
              />
            </div>

            <div>
              <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-1.5">
                Confirm
              </label>
              <input
                type="password"
                value={form.confirm}
                onChange={u("confirm")}
                required
                className="w-full h-11 px-4 text-[15px] bg-transparent border border-line rounded-lg focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all duration-200"
                placeholder="Repeat password"
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
                  Creating...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          {/* Terms notice */}
          <p className="text-[12px] text-fg-muted text-center leading-relaxed">
            By signing up you agree to our{" "}
            <Link href="/terms" className="text-fg-secondary hover:text-fg underline">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-fg-secondary hover:text-fg underline">Privacy Policy</Link>
          </p>

          {/* Bottom link */}
          <p className="text-[14px] text-fg-muted text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-green font-medium hover:underline">
              Log in
            </Link>
          </p>
        </motion.div>
    </div>
  );
}
