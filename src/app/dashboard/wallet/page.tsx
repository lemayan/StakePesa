"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkline } from "@/components/ui/sparkline";
import { useToast } from "@/components/ui/toast";

/* ── Mock data ── */
const balanceHistory = [2500, 3100, 2800, 4200, 3900, 5250, 4250];

const txns = [
  { desc: "Paystack Deposit", amt: "+1,000", date: "Mar 11", ref: "PS_7F2GHSL", type: "deposit" },
  { desc: "Won: No sugar challenge", amt: "+2,000", date: "Mar 10", ref: "WN_82KSLP3", type: "win" },
  { desc: "Staked: Arsenal vs City", amt: "-500", date: "Mar 10", ref: "SK_19VMRT4", type: "stake" },
  { desc: "Bank Withdrawal", amt: "-3,000", date: "Mar 8", ref: "WD_55BNCX1", type: "withdraw" },
  { desc: "Paystack Deposit", amt: "+5,000", date: "Mar 5", ref: "PS_3A9JHRD", type: "deposit" },
  { desc: "Won: Morning run streak", amt: "+4,200", date: "Mar 3", ref: "WN_KL29SOM", type: "win" },
  { desc: "Staked: Ruto prediction", amt: "-1,000", date: "Mar 1", ref: "SK_MMN41PQ", type: "stake" },
];

const typeColors: Record<string, string> = {
  deposit: "text-fg",
  win: "text-green",
  stake: "text-red",
  withdraw: "text-fg-muted",
};

const typeIcons: Record<string, string> = {
  deposit: "M12 4.5v15m7.5-7.5h-15",
  win: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  stake: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z",
  withdraw: "M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75",
};

export default function WalletPage() {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [txnFilter, setTxnFilter] = useState<"all" | "in" | "out">("all");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const filteredTxns = txns.filter((t) => {
    if (txnFilter === "all") return true;
    if (txnFilter === "in") return t.amt.startsWith("+");
    return t.amt.startsWith("-");
  });

  const handleTransaction = () => {
    if (!amount || Number(amount) < 100) {
      toast("error", "Invalid amount", "Minimum amount is 100 KES");
      return;
    }
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      if (tab === "deposit") {
        toast("success", "Deposit initiated!", `${Number(amount).toLocaleString()} KES via Paystack`);
      } else {
        toast("success", "Withdrawal processing", `${Number(amount).toLocaleString()} KES to your bank account`);
      }
      setAmount("");
    }, 1500);
  };

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
            <span className="text-[36px] font-mono font-bold tabular-nums leading-none">
              4,250
            </span>
            <span className="text-[16px] font-mono text-fg-muted">KES</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[12px] font-mono text-green font-medium">+12.4%</span>
            <span className="text-[11px] font-mono text-fg-muted">vs last week</span>
          </div>
        </div>

        {/* In Escrow */}
        <div className="bg-bg p-5">
          <span className="text-[12px] font-mono text-fg-muted uppercase tracking-wider">
            In Escrow
          </span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-[36px] font-mono font-bold tabular-nums text-amber leading-none">
              2,000
            </span>
            <span className="text-[16px] font-mono text-fg-muted">KES</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[12px] font-mono text-fg-muted">3 active markets</span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="bg-bg p-5 flex flex-col justify-between">
          <span className="text-[12px] font-mono text-fg-muted uppercase tracking-wider">
            7-Day Trend
          </span>
          <div className="mt-2 flex-1 flex items-end">
            <Sparkline data={balanceHistory} color="#22c55e" height={48} />
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
            <button
              onClick={() => setTab("deposit")}
              className={`h-10 text-[13px] font-mono uppercase tracking-wider transition-all ${
                tab === "deposit"
                  ? "bg-bg-above text-green font-semibold"
                  : "text-fg-muted hover:text-fg-secondary"
              }`}
            >
              Deposit
            </button>
            <button
              onClick={() => setTab("withdraw")}
              className={`h-10 text-[13px] font-mono uppercase tracking-wider border-l border-line transition-all ${
                tab === "withdraw"
                  ? "bg-bg-above text-green font-semibold"
                  : "text-fg-muted hover:text-fg-secondary"
              }`}
            >
              Withdraw
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Amount input */}
            <div>
              <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-1.5">
                Amount (KES)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-10 px-3 text-[16px] font-mono bg-transparent border border-line rounded-md focus:border-green focus:ring-1 focus:ring-green/20 focus:outline-none transition-all tabular-nums"
                placeholder="1000"
                min="100"
              />
            </div>

            {/* Quick amounts */}
            <div className="flex gap-1.5 flex-wrap">
              {["500", "1000", "2000", "5000"].map((v) => (
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

            {/* Payment info */}
            <div className="bg-bg-above/40 rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between text-[12px] font-mono">
                <span className="text-fg-muted">Platform</span>
                <span className="flex items-center gap-1.5 text-fg-secondary font-medium">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <rect width="24" height="24" rx="4" fill="#00C3F7" fillOpacity={0.15} />
                    <path d="M7 8h10v2H7V8zm0 3h7v2H7v-2zm0 3h4v2H7v-2z" fill="currentColor" />
                  </svg>
                  Paystack
                </span>
              </div>
              <div className="flex items-center justify-between text-[12px] font-mono">
                <span className="text-fg-muted">Fee</span>
                <span className="text-fg-secondary">1.5%</span>
              </div>
              {amount && (
                <div className="flex items-center justify-between text-[12px] font-mono pt-1 border-t border-line">
                  <span className="text-fg-muted">You {tab === "deposit" ? "receive" : "get"}</span>
                  <span className="text-green font-semibold">
                    {tab === "deposit"
                      ? Number(amount).toLocaleString()
                      : Math.floor(Number(amount) * 0.985).toLocaleString()
                    } KES
                  </span>
                </div>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleTransaction}
              disabled={processing}
              className="w-full h-10 text-[14px] font-semibold bg-green text-white rounded-md hover:shadow-lg hover:shadow-green/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  />
                  Processing...
                </>
              ) : tab === "deposit" ? (
                "Deposit with Paystack"
              ) : (
                "Withdraw to Bank"
              )}
            </motion.button>

            <p className="text-[11px] font-mono text-fg-muted text-center">
              {tab === "deposit"
                ? "Card, bank transfer, or mobile money supported"
                : "Processed within 24 hours to your bank account"}
            </p>
          </div>
        </motion.div>

        {/* ── Summary cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45 }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-px bg-line border border-line rounded-lg overflow-hidden">
            {[
              { label: "Total Deposited", val: "12,500", sub: "5 deposits", color: "text-fg" },
              { label: "Total Withdrawn", val: "6,000", sub: "2 withdrawals", color: "text-fg" },
              { label: "Net P&L", val: "+4,250", sub: "all time", color: "text-green" },
              { label: "Avg. Stake", val: "1,250", sub: "per market", color: "text-fg" },
            ].map((s, i) => (
              <div key={i} className="bg-bg p-4">
                <span className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">
                  {s.label}
                </span>
                <div className="mt-1.5">
                  <span className={`text-[22px] font-mono font-bold tabular-nums ${s.color}`}>
                    {s.val}
                  </span>
                  <span className="text-[11px] font-mono text-fg-muted ml-1.5">{s.sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Payment methods */}
          <div className="border border-line rounded-lg p-4">
            <h3 className="text-[12px] font-mono text-fg-muted uppercase tracking-wider mb-3">
              Payment Methods
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-bg-above/40 rounded-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-bg-above border border-line flex items-center justify-center text-[12px] font-mono font-bold text-fg-muted">
                    💳
                  </div>
                  <div>
                    <span className="text-[13px] font-medium block">Visa •••• 4242</span>
                    <span className="text-[11px] font-mono text-fg-muted">Expires 12/26</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-green">Default</span>
              </div>
              <button
                onClick={() => toast("info", "Coming soon", "Payment method management will be available soon")}
                className="w-full flex items-center justify-center gap-1.5 h-9 border border-dashed border-line rounded-md text-[12px] font-mono text-fg-muted hover:text-fg-secondary hover:border-line-bright transition-all"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add payment method
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Transactions ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-mono text-fg-muted uppercase tracking-wider">
            Transactions
          </h2>
          <div className="flex items-center h-7 border border-line rounded-md overflow-hidden">
            {([["all", "All"], ["in", "In"], ["out", "Out"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTxnFilter(key)}
                className={`px-2.5 h-full text-[11px] font-mono uppercase tracking-wider transition-all ${
                  txnFilter === key
                    ? "bg-bg-above text-fg font-semibold"
                    : "text-fg-muted hover:text-fg-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-line rounded-lg overflow-hidden">
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-[1fr_90px_80px_100px] h-9 items-center px-3 border-b border-line bg-bg-above/40 text-[11px] font-mono text-fg-muted uppercase tracking-wider">
            <span>Description</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Date</span>
            <span className="text-right">Ref</span>
          </div>
          {filteredTxns.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.04, duration: 0.3 }}
            >
              {/* Desktop row */}
              <div className="hidden sm:grid grid-cols-[1fr_90px_80px_100px] h-11 items-center px-3 border-b border-line last:border-b-0 text-[13px] hover:bg-bg-above/40 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                    t.type === "win" ? "bg-green/10" :
                    t.type === "stake" ? "bg-red/10" :
                    "bg-bg-above"
                  }`}>
                    <svg
                      className={`w-3 h-3 ${
                        t.type === "win" ? "text-green" :
                        t.type === "stake" ? "text-red" :
                        "text-fg-muted"
                      }`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={typeIcons[t.type]} />
                    </svg>
                  </div>
                  <span className="truncate">{t.desc}</span>
                </div>
                <span className={`text-right font-mono font-semibold ${typeColors[t.type]}`}>
                  {t.amt}
                </span>
                <span className="text-right font-mono text-fg-muted text-[12px]">{t.date}</span>
                <span className="text-right font-mono text-fg-muted text-[11px]">{t.ref}</span>
              </div>

              {/* Mobile row */}
              <div className="sm:hidden flex items-center gap-2.5 px-3 py-2.5 border-b border-line last:border-b-0">
                <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                  t.type === "win" ? "bg-green/10" :
                  t.type === "stake" ? "bg-red/10" :
                  "bg-bg-above"
                }`}>
                  <svg
                    className={`w-3.5 h-3.5 ${
                      t.type === "win" ? "text-green" :
                      t.type === "stake" ? "text-red" :
                      "text-fg-muted"
                    }`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={typeIcons[t.type]} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] truncate">{t.desc}</p>
                  <span className="text-[11px] font-mono text-fg-muted">{t.date}</span>
                </div>
                <span className={`text-[13px] font-mono font-semibold shrink-0 ${typeColors[t.type]}`}>
                  {t.amt}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
