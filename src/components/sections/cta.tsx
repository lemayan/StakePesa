"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function CallToAction() {
  return (
    <section className="border-t border-line relative overflow-hidden">
      {/* Subtle background grid */}
      <div className="absolute inset-0 bg-grid opacity-[0.03]" />

      <div className="relative max-w-3xl mx-auto text-center py-16 sm:py-24 md:py-32 px-5 sm:px-8">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-mono text-[13px] text-fg-muted uppercase tracking-[0.2em] mb-5"
        >
          StakePesa. Back your word
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-[clamp(2rem,5vw,3.25rem)] font-bold tracking-tight leading-tight"
        >
          Stake as low as{" "}
          <span className="font-mono text-green">100 KES</span> for any number
          of friends. Winner gets it all.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="text-fg-secondary text-[15px] sm:text-[18px] mt-4 sm:mt-5 max-w-xl mx-auto"
        >
          Na wacha mbogi ijudge. <span className="text-fg font-semibold">Hakuna kuchenga.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-7 sm:mt-9"
        >
          <Link
            href="/signup"
            className="h-12 px-7 text-[15px] sm:text-[16px] font-semibold bg-green text-white rounded flex items-center justify-center hover:opacity-90 transition-opacity duration-200"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="h-12 px-7 text-[15px] sm:text-[16px] text-fg-secondary border border-line rounded flex items-center justify-center hover:bg-bg-above hover:border-line-bright transition-all duration-200"
          >
            Log in
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
