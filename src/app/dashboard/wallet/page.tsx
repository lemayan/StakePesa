"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkline } from "@/components/ui/sparkline";
import { useToast } from "@/components/ui/toast";

// ── Types ──────────────────────────────────────
interface WalletData {
  balanceCents: number;
  balanceKES: number;
  phone: string | null;
  isVerified: boolean;
  transactions: {
    id: string;
    type: "DEPOSIT" | "WITHDRAWAL";
    amountCents: number;
    status: "PENDING" | "SUCCESS" | "FAILED";
    createdAt: string;
  }[];
}

type TabType = "deposit" | "withdraw";
type Step = "form" | "pending" | "success" | "failed";

const QUICK_AMOUNTS = ["500", "1000", "2000", "5000"];

// ── Status badge ───────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SUCCESS: "text-green bg-green/10 border-green/20",
    PENDING: "text-amber bg-amber/10 border-amber/20",
    FAILED: "text-red bg-red/10 border-red/20",
  };
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 border rounded uppercase ${map[status] ?? "text-fg-muted"}`}>
      {status}
    </span>
  );
}

// ── Main Page ──────────────────────────────────
export default function WalletPage() {
  const [tab, setTab] = useState<TabType>("deposit");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [pendingApiRef, setPendingApiRef] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [txnFilter, setTxnFilter] = useState<"all" | "in" | "out">("all");
  const { toast } = useToast();

  // ── Fetch wallet data ──────────────────────────
  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/payments/wallet");
      if (!res.ok) throw new Error("Failed to fetch wallet");
      const data = await res.json();
      setWalletData(data);
      if (data.phone) setPhone(data.phone);
    } catch {
      toast("error", "Could not load wallet", "Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  // ── Handle deposit ─────────────────────────────
  const handleDeposit = async () => {
    const amt = Number(amount);
    if (!amt || amt < 10) { toast("error", "Invalid amount", "Minimum deposit is KES 10."); return; }
    if (!phone) { toast("error", "Phone required", "Enter your M-Pesa number."); return; }

    setStep("pending");

    try {
      const res = await fetch("/api/payments/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountKES: amt, phone }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast("error", "Deposit failed", data.error ?? "Please try again.");
        setStep("form");
        return;
      }

      // Show pending — user must approve on phone
      // Poll for status every 5s for up to 2 min
      toast("success", "M-Pesa prompt sent!", "Check your phone and enter your PIN.");
      setPendingApiRef(data.apiRef);
      pollForConfirmation(data.apiRef, amt);
    } catch {
      toast("error", "Network error", "Please try again.");
      setStep("form");
    }
  };

  // ── Handle withdrawal ──────────────────────────
  const handleWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt < 10) { toast("error", "Invalid amount", "Minimum withdrawal is KES 10."); return; }
    if (!walletData || amt > walletData.balanceKES) {
      toast("error", "Insufficient balance", `You have KES ${walletData?.balanceKES ?? 0} available.`);
      return;
    }
    if (!phone) { toast("error", "Phone required", "Enter your M-Pesa number."); return; }

    setStep("pending");

    try {
      const res = await fetch("/api/payments/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountKES: amt, phone }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast("error", "Withdrawal failed", data.error ?? "Please try again.");
        setStep("form");
        return;
      }

      setStep("success");
      toast("success", "Withdrawal initiated!", `KES ${amt} is being sent to ${phone}.`);
      setTimeout(() => { setStep("form"); setAmount(""); fetchWallet(); }, 4000);
    } catch {
      toast("error", "Network error", "Please try again.");
      setStep("form");
    }
  };

  // ── Poll for specific transaction status ──────
  const pollForConfirmation = (apiRef: string, amtKES: number) => {
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes at 5s intervals

    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/payments/status/${apiRef}`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.status === "SUCCESS") {
          clearInterval(interval);
          fetchWallet();
          setStep("success");
          toast("success", "Payment confirmed! 🎉", `KES ${amtKES.toLocaleString()} added to your wallet.`);
          setTimeout(() => { setStep("form"); setAmount(""); }, 4000);
        } else if (data.status === "FAILED") {
          clearInterval(interval);
          setStep("failed");
          toast("error", "Payment not confirmed", "Check your M-Pesa messages.");
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setStep("failed");
          toast("error", "Timeout", "Payment not confirmed within 2 minutes.");
        }
      } catch { /* keep polling on network errors */ }
    }, 5000);
  };

  // ── Derived ────────────────────────────────────
  const filteredTxns = (walletData?.transactions ?? []).filter((t) => {
    if (txnFilter === "in") return t.type === "DEPOSIT";
    if (txnFilter === "out") return t.type === "WITHDRAWAL";
    return true;
  });

  const balanceKES = walletData?.balanceKES ?? 0;
  const fakeHistory = [balanceKES * 0.6, balanceKES * 0.7, balanceKES * 0.65, balanceKES * 0.8, balanceKES * 0.9, balanceKES * 0.95, balanceKES];

  return (
    <div className="max-w-5xl space-y-6">

      {/* ── Balance overview ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_200px] gap-px bg-line border border-line rounded-lg overflow-hidden"
      >
        {/* Available */}
        <div className="bg-bg p-5">
          <span className="text-[12px] font-mono text-fg-muted uppercase tracking-wider">
            Available Balance
          </span>
          <div className="flex items-baseline gap-1.5 mt-2">
            {loading ? (
              <div className="h-9 w-32 bg-bg-above animate-pulse rounded" />
            ) : (
              <>
                <span className="text-[36px] font-mono font-bold tabular-nums leading-none">
                  {balanceKES.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[16px] font-mono text-fg-muted">KES</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[12px] font-mono text-fg-muted">Real M-Pesa balance</span>
          </div>
        </div>

        {/* In Escrow — placeholder, wired later */}
        <div className="bg-bg p-5">
          <span className="text-[12px] font-mono text-fg-muted uppercase tracking-wider">
            In Escrow
          </span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-[36px] font-mono font-bold tabular-nums text-amber leading-none">0</span>
            <span className="text-[16px] font-mono text-fg-muted">KES</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[12px] font-mono text-fg-muted">Active bets locked</span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="bg-bg p-5 flex flex-col justify-between">
          <span className="text-[12px] font-mono text-fg-muted uppercase tracking-wider">
            Balance Trend
          </span>
          <div className="mt-2 flex-1 flex items-end">
            <Sparkline data={fakeHistory.map((v) => Math.max(0, v))} color="#22c55e" height={48} />
          </div>
        </div>
      </motion.div>

      {/* ── Deposit / Withdraw panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="border border-line rounded-lg overflow-hidden"
        >
          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-line">
            {(["deposit", "withdraw"] as TabType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setStep("form"); setAmount(""); }}
                className={`h-10 text-[13px] font-mono uppercase tracking-wider transition-all ${
                  t === "withdraw" ? "border-l border-line" : ""
                } ${
                  tab === t
                    ? "bg-bg-above text-green font-semibold"
                    : "text-fg-muted hover:text-fg-secondary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4">
            <AnimatePresence mode="wait">

              {/* ── FORM STEP ── */}
              {step === "form" && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Phone input */}
                  <div>
                    <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-1.5">
                      M-Pesa Number
                    </label>
                    <input
                      id="wallet-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-10 px-3 text-[14px] font-mono bg-transparent border border-line rounded-md focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all"
                      placeholder="07XXXXXXXX"
                    />
                  </div>

                  {/* Amount input */}
                  <div>
                    <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-1.5">
                      Amount (KES)
                    </label>
                    <input
                      id="wallet-amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full h-10 px-3 text-[16px] font-mono bg-transparent border border-line rounded-md focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all tabular-nums"
                      placeholder="1000"
                      min="10"
                      max={tab === "withdraw" ? balanceKES : 250000}
                    />
                    {tab === "withdraw" && walletData && (
                      <p className="text-[11px] font-mono text-fg-muted mt-1">
                        Available: KES {balanceKES.toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Quick amounts */}
                  <div className="flex gap-1.5 flex-wrap">
                    {QUICK_AMOUNTS.map((v) => (
                      <button
                        key={v}
                        onClick={() => setAmount(v)}
                        className={`h-8 px-3 text-[12px] font-mono border rounded-md transition-all ${
                          amount === v
                            ? "border-green text-green bg-green/8 font-semibold"
                            : "border-line text-fg-muted hover:text-fg-secondary hover:border-line-bright"
                        }`}
                      >
                        {Number(v).toLocaleString()}
                      </button>
                    ))}
                  </div>

                  {/* Fee breakdown */}
                  {amount && Number(amount) > 0 && (
                    <div className="bg-bg-above/40 rounded-md p-3 space-y-1.5 text-[12px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-fg-muted">Provider</span>
                        <span className="text-fg-secondary font-medium">IntaSend · M-Pesa</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-muted">Platform fee</span>
                        <span className="text-fg-secondary">2%</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-line">
                        <span className="text-fg-muted">
                          {tab === "deposit" ? "Credited to wallet" : "You receive"}
                        </span>
                        <span className="text-green font-semibold">
                          KES {tab === "deposit"
                            ? Number(amount).toLocaleString()
                            : Math.floor(Number(amount) * 0.98).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <motion.button
                    id={`wallet-${tab}-btn`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={tab === "deposit" ? handleDeposit : handleWithdraw}
                    className="w-full h-11 text-[14px] font-semibold bg-green text-white rounded-md hover:shadow-lg hover:shadow-green/20 transition-all flex items-center justify-center gap-2"
                  >
                    {tab === "deposit" ? "🟢 Deposit via M-Pesa" : "💸 Withdraw to M-Pesa"}
                  </motion.button>

                  <p className="text-[11px] font-mono text-fg-muted text-center">
                    {tab === "deposit"
                      ? "You'll receive an M-Pesa PIN prompt on your phone"
                      : "Sent to your M-Pesa within minutes"}
                  </p>
                </motion.div>
              )}

              {/* ── PENDING STEP ── */}
              {step === "pending" && (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-10 space-y-4 text-center"
                >
                  <motion.div
                    className="w-14 h-14 rounded-full border-4 border-green/30 border-t-green"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  />
                  <div>
                    <p className="text-[15px] font-semibold">
                      {tab === "deposit" ? "Waiting for M-Pesa PIN..." : "Processing withdrawal..."}
                    </p>
                    <p className="text-[12px] font-mono text-fg-muted mt-1">
                      {tab === "deposit"
                        ? "Check your phone and enter your M-Pesa PIN"
                        : "IntaSend is sending funds to your number"}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep("form")}
                    className="text-[12px] font-mono text-fg-muted hover:text-fg-secondary underline"
                  >
                    Cancel
                  </button>
                  {/* Test-only simulate button */}
                  {pendingApiRef && (
                    <button
                      onClick={async () => {
                        const res = await fetch("/api/payments/test-webhook", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ apiRef: pendingApiRef }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          fetchWallet();
                          setStep("success");
                          toast("success", "Payment simulated! 🎉", "Wallet balance updated.");
                          setTimeout(() => { setStep("form"); setAmount(""); }, 4000);
                        } else {
                          toast("error", "Simulate failed", data.error);
                        }
                      }}
                      className="h-8 px-4 text-[12px] font-mono border border-amber/40 text-amber rounded-md hover:bg-amber/10 transition-all"
                    >
                      🧪 Simulate Payment (Test Mode)
                    </button>
                  )}
                </motion.div>
              )}

              {/* ── SUCCESS STEP ── */}
              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-10 space-y-3 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-14 h-14 rounded-full bg-green/15 flex items-center justify-center text-[28px]"
                  >
                    ✅
                  </motion.div>
                  <p className="text-[16px] font-semibold text-green">
                    {tab === "deposit" ? "Deposit Confirmed!" : "Withdrawal Sent!"}
                  </p>
                  <p className="text-[12px] font-mono text-fg-muted">
                    KES {Number(amount).toLocaleString()} · Your balance has been updated.
                  </p>
                </motion.div>
              )}

              {/* ── FAILED STEP ── */}
              {step === "failed" && (
                <motion.div
                  key="failed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-10 space-y-3 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-red/10 flex items-center justify-center text-[28px]">❌</div>
                  <p className="text-[15px] font-semibold">Payment not confirmed</p>
                  <p className="text-[12px] font-mono text-fg-muted">Check your M-Pesa messages. No money was deducted.</p>
                  <button
                    onClick={() => setStep("form")}
                    className="h-9 px-4 text-[13px] font-semibold border border-line rounded-md hover:bg-bg-above transition-all"
                  >
                    Try Again
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Right column: Stats ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45 }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-px bg-line border border-line rounded-lg overflow-hidden">
            {[
              {
                label: "Total Deposited",
                val: `KES ${((walletData?.transactions.filter(t => t.type === "DEPOSIT" && t.status === "SUCCESS").reduce((s, t) => s + t.amountCents, 0) ?? 0) / 100).toLocaleString()}`,
                sub: `${walletData?.transactions.filter(t => t.type === "DEPOSIT" && t.status === "SUCCESS").length ?? 0} deposits`,
              },
              {
                label: "Total Withdrawn",
                val: `KES ${((walletData?.transactions.filter(t => t.type === "WITHDRAWAL" && t.status === "SUCCESS").reduce((s, t) => s + t.amountCents, 0) ?? 0) / 100).toLocaleString()}`,
                sub: `${walletData?.transactions.filter(t => t.type === "WITHDRAWAL" && t.status === "SUCCESS").length ?? 0} withdrawals`,
              },
              { label: "Current Balance", val: `KES ${balanceKES.toLocaleString()}`, sub: "available now", color: "text-green" },
              { label: "Provider", val: "IntaSend", sub: "M-Pesa enabled" },
            ].map((s, i) => (
              <div key={i} className="bg-bg p-4">
                <span className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">{s.label}</span>
                <div className="mt-1.5">
                  <span className={`text-[18px] font-mono font-bold tabular-nums ${"color" in s ? s.color : ""}`}>
                    {loading ? "..." : s.val}
                  </span>
                  <span className="text-[11px] font-mono text-fg-muted ml-1.5">{s.sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* M-Pesa badge */}
          <div className="border border-green/20 bg-green/5 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green/15 flex items-center justify-center text-[20px]">📱</div>
            <div>
              <p className="text-[14px] font-semibold">Powered by M-Pesa via IntaSend</p>
              <p className="text-[12px] font-mono text-fg-muted mt-0.5">
                Instant deposits · Withdrawals in minutes · 2% platform fee
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Transaction history ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-mono text-fg-muted uppercase tracking-wider">Transactions</h2>
          <div className="flex items-center h-7 border border-line rounded-md overflow-hidden">
            {([ ["all", "All"], ["in", "In"], ["out", "Out"] ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTxnFilter(key)}
                className={`px-2.5 h-full text-[11px] font-mono uppercase tracking-wider transition-all ${
                  txnFilter === key ? "bg-bg-above text-fg font-semibold" : "text-fg-muted hover:text-fg-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-line rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[13px] font-mono text-fg-muted">Loading transactions...</div>
          ) : filteredTxns.length === 0 ? (
            <div className="p-8 text-center text-[13px] font-mono text-fg-muted">
              No transactions yet. Make your first deposit above 👆
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-[1fr_100px_90px_80px] h-9 items-center px-3 border-b border-line bg-bg-above/40 text-[11px] font-mono text-fg-muted uppercase tracking-wider">
                <span>Description</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Status</span>
                <span className="text-right">Date</span>
              </div>
              {filteredTxns.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.04, duration: 0.3 }}
                >
                  <div className="hidden sm:grid grid-cols-[1fr_100px_90px_80px] h-11 items-center px-3 border-b border-line last:border-b-0 text-[13px] hover:bg-bg-above/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${t.type === "DEPOSIT" ? "bg-green" : "bg-amber"}`} />
                      <span>{t.type === "DEPOSIT" ? "M-Pesa Deposit" : "M-Pesa Withdrawal"}</span>
                    </div>
                    <span className={`text-right font-mono font-semibold ${t.type === "DEPOSIT" ? "text-green" : "text-fg"}`}>
                      {t.type === "DEPOSIT" ? "+" : "-"}KES {(t.amountCents / 100).toLocaleString()}
                    </span>
                    <span className="flex justify-end"><StatusBadge status={t.status} /></span>
                    <span className="text-right font-mono text-fg-muted text-[11px]">
                      {new Date(t.createdAt).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  {/* Mobile row */}
                  <div className="sm:hidden flex items-center gap-2.5 px-3 py-2.5 border-b border-line last:border-b-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${t.type === "DEPOSIT" ? "bg-green" : "bg-amber"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px]">{t.type === "DEPOSIT" ? "M-Pesa Deposit" : "Withdrawal"}</p>
                      <span className="text-[11px] font-mono text-fg-muted">
                        {new Date(t.createdAt).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <div className="text-right space-y-1">
                      <p className={`text-[13px] font-mono font-semibold ${t.type === "DEPOSIT" ? "text-green" : "text-fg"}`}>
                        {t.type === "DEPOSIT" ? "+" : "-"}KES {(t.amountCents / 100).toLocaleString()}
                      </p>
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
