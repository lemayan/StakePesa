"use client";

import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    cmd: "CREATE",
    title: "Fungua market",
    desc: 'Define the challenge, set the stake amount, invite your crew. "No sugar for 7 days" — "Arsenal to win" — literally anything.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    step: "02",
    cmd: "LOCK",
    title: "Pesa inaingia escrow",
    desc: "Everyone deposits via M-Pesa. Funds are locked — no one backs out, no one runs. The pot is sealed until settlement.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    step: "03",
    cmd: "SETTLE",
    title: "Mbogi inajudge",
    desc: "When it ends, participants vote on the outcome. Winners get paid instantly. Losers learn to keep their word. Hakuna kuchenga.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-line">
      {/* Section label */}
      <div className="h-11 border-b border-line bg-bg-above/60 backdrop-blur-sm flex items-center px-5 md:px-8">
        <span className="text-[13px] font-mono text-fg-muted uppercase tracking-wider">
          How it works
        </span>
      </div>

      <div className="grid md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="border-b md:border-b-0 md:border-r border-line last:border-r-0 last:border-b-0 p-5 sm:p-8 md:p-10 group hover:bg-bg-above/40 transition-all duration-300 relative overflow-hidden"
          >
            <div className="relative">
              {/* Step icon */}
              <div className="w-14 h-14 rounded-lg border border-line bg-bg-above flex items-center justify-center text-green mb-5">
                {s.icon}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-[14px] text-fg-muted">
                  {s.step}
                </span>
                <span className="font-mono text-[13px] text-green bg-green-dim px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
                  {s.cmd}
                </span>
              </div>

              <h3 className="text-[20px] sm:text-[24px] font-bold mb-2 sm:mb-3">{s.title}</h3>
              <p className="text-[14px] sm:text-[16px] text-fg-secondary leading-relaxed">
                {s.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
