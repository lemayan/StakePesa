"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

export default function InvitePage() {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);

  const userName = session?.user?.name || "User";
  // Generate a simple code from the user's name (first 3 chars uppercase + random-ish)
  const nameSlug = userName.replace(/\s+/g, "").slice(0, 4).toUpperCase();
  const code = `${nameSlug}42`;
  const link = `https://stakepesa.com/ref/${code}`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* ── Hero banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="border border-line rounded-lg p-6 relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-green/[0.06] rounded-full blur-[60px] pointer-events-none" />
        <h1 className="text-[22px] font-bold relative">Invite ndio upate bonus</h1>
        <p className="text-[14px] text-fg-secondary relative leading-relaxed mt-1.5 max-w-md">
          Share your link. When friends sign up and finish their first market,
          you both earn <span className="text-green font-mono font-bold">100 KES</span>.
        </p>
      </motion.div>

      {/* ── Referral link + code ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45 }}
        className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3"
      >
        {/* Link */}
        <div>
          <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-1.5">
            Referral link
          </label>
          <div className="flex items-center border border-line rounded-md overflow-hidden">
            <div className="flex-1 h-9 px-3 flex items-center text-[13px] font-mono text-fg-muted truncate bg-bg-above/40">
              {link}
            </div>
            <button
              onClick={() => copy(link)}
              className={`h-9 px-4 text-[13px] font-semibold border-l border-line transition-all shrink-0 ${
                copied ? "bg-green/8 text-green" : "hover:bg-bg-above text-fg-secondary"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Code */}
        <div>
          <label className="text-[12px] font-mono text-fg-muted uppercase tracking-wider block mb-1.5">
            Code
          </label>
          <button
            onClick={() => copy(code)}
            className="w-full h-9 px-3 text-[15px] font-mono font-bold text-fg border border-line rounded-md bg-bg-above/40 hover:bg-bg-above transition-all text-center"
          >
            {code}
          </button>
        </div>
      </motion.div>

      {/* ── Stats strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.45 }}
        className="grid grid-cols-3 gap-px bg-line border border-line rounded-lg overflow-hidden"
      >
        {[
          { label: "Referrals", val: "7", color: "text-fg" },
          { label: "Earned", val: "700", unit: "KES", color: "text-green" },
          { label: "Pending", val: "200", unit: "KES", color: "text-amber" },
        ].map((s, i) => (
          <div key={i} className="bg-bg p-4">
            <span className="text-[11px] font-mono text-fg-muted uppercase tracking-wider">
              {s.label}
            </span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className={`text-[26px] font-mono font-bold tabular-nums ${s.color}`}>
                {s.val}
              </span>
              {s.unit && <span className="text-[13px] font-mono text-fg-muted">{s.unit}</span>}
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Share buttons ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.45 }}
        className="flex items-center gap-2 flex-wrap"
      >
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${userName} invited you to StakePesa! Join here: ${link}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="h-9 px-4 text-[13px] border border-line rounded-md hover:bg-bg-above transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.546 21.2c-.106.39.284.756.664.625l3.868-1.31A9.95 9.95 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
          </svg>
          WhatsApp
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${userName} invited you to @StakePesa! ${link}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="h-9 px-4 text-[13px] border border-line rounded-md hover:bg-bg-above transition-all flex items-center gap-2"
        >
          <span className="text-[14px] font-bold">𝕏</span>
          Twitter / X
        </a>
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`${userName} invited you to StakePesa!`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="h-9 px-4 text-[13px] border border-line rounded-md hover:bg-bg-above transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
          </svg>
          Telegram
        </a>
      </motion.div>

      {/* ── Referral history ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45 }}
      >
        <h2 className="text-[13px] font-mono text-fg-muted uppercase tracking-wider mb-3">
          Referral History
        </h2>
        <div className="border border-line rounded-lg overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_100px_80px_80px] h-9 items-center px-3 border-b border-line bg-bg-above/40 text-[11px] font-mono text-fg-muted uppercase tracking-wider">
            <span>User</span>
            <span className="text-center">Status</span>
            <span className="text-right">Earned</span>
            <span className="text-right">Date</span>
          </div>
          {[
            { name: "John K.", status: "Completed", earned: "+100", date: "Mar 10" },
            { name: "Alice M.", status: "Completed", earned: "+100", date: "Mar 8" },
            { name: "Brian O.", status: "Completed", earned: "+100", date: "Mar 5" },
            { name: "Grace W.", status: "Completed", earned: "+100", date: "Mar 3" },
            { name: "David L.", status: "Completed", earned: "+100", date: "Feb 28" },
            { name: "Sarah N.", status: "Pending", earned: "—", date: "Mar 11" },
            { name: "Peter A.", status: "Pending", earned: "—", date: "Mar 9" },
          ].map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.04, duration: 0.3 }}
            >
              {/* Desktop */}
              <div className="hidden sm:grid grid-cols-[1fr_100px_80px_80px] h-10 items-center px-3 border-b border-line last:border-b-0 text-[13px] hover:bg-bg-above/40 transition-colors">
                <span className="font-medium">{r.name}</span>
                <span className="text-center">
                  <span className={`text-[11px] font-mono font-medium px-1.5 py-0.5 rounded ${
                    r.status === "Completed"
                      ? "bg-green/10 text-green"
                      : "bg-amber/10 text-amber"
                  }`}>
                    {r.status}
                  </span>
                </span>
                <span className={`text-right font-mono font-semibold ${
                  r.earned === "—" ? "text-fg-muted" : "text-green"
                }`}>
                  {r.earned}
                </span>
                <span className="text-right font-mono text-fg-muted text-[12px]">{r.date}</span>
              </div>

              {/* Mobile */}
              <div className="sm:hidden flex items-center justify-between px-3 py-2.5 border-b border-line last:border-b-0">
                <div>
                  <span className="text-[13px] font-medium block">{r.name}</span>
                  <span className="text-[11px] font-mono text-fg-muted">{r.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-mono font-medium px-1.5 py-0.5 rounded ${
                    r.status === "Completed" ? "bg-green/10 text-green" : "bg-amber/10 text-amber"
                  }`}>
                    {r.status}
                  </span>
                  <span className={`text-[13px] font-mono font-semibold ${
                    r.earned === "—" ? "text-fg-muted" : "text-green"
                  }`}>
                    {r.earned}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── How it works ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.45 }}
        className="border border-line rounded-lg p-5"
      >
        <h2 className="text-[13px] font-mono text-fg-muted uppercase tracking-wider mb-4">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Share your link", desc: "Send your referral link to friends via WhatsApp, Twitter, or any channel" },
            { step: "2", title: "Friend joins & plays", desc: "They sign up with your link and complete their first market" },
            { step: "3", title: "Both earn 100 KES", desc: "Bonus is credited instantly to both wallets" },
          ].map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-7 h-7 rounded bg-green/10 flex items-center justify-center shrink-0">
                <span className="text-[13px] font-mono font-bold text-green">{s.step}</span>
              </div>
              <div>
                <p className="text-[14px] font-semibold">{s.title}</p>
                <p className="text-[12px] text-fg-muted mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
