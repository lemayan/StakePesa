"use client";

import Image from "next/image";
import { Logo } from "@/components/ui/logo";
import { motion } from "framer-motion";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 p-5 sm:p-8 md:px-12 md:py-12 text-[14px] sm:text-[15px]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <span className="inline-block">
            <Logo iconSize={38} textSize="text-[22px]" />
          </span>
          <p className="text-fg-muted mt-3 leading-relaxed text-[14px]">
            Dare, Stake, Achieve.
            <br />
            Nairobi, Kenya
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <p className="font-mono text-[13px] text-fg-muted uppercase tracking-wider mb-4">
            Product
          </p>
          <ul className="space-y-2.5 text-fg-secondary text-[15px]">
            <li><a href="#markets" className="hover:text-fg transition-colors duration-200">Markets</a></li>
            <li><a href="#how" className="hover:text-fg transition-colors duration-200">How it works</a></li>
            <li><a href="/signup" className="hover:text-fg transition-colors duration-200">Get started</a></li>
          </ul>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <p className="font-mono text-[13px] text-fg-muted uppercase tracking-wider mb-4">
            Company
          </p>
          <ul className="space-y-2.5 text-fg-secondary text-[15px]">
            <li><a href="#" className="hover:text-fg transition-colors duration-200">About</a></li>
            <li><a href="#" className="hover:text-fg transition-colors duration-200">Blog</a></li>
            <li><a href="#" className="hover:text-fg transition-colors duration-200">Careers</a></li>
          </ul>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <p className="font-mono text-[13px] text-fg-muted uppercase tracking-wider mb-4">
            Legal
          </p>
          <ul className="space-y-2.5 text-fg-secondary text-[15px]">
            <li><a href="#" className="hover:text-fg transition-colors duration-200">Privacy</a></li>
            <li><a href="#" className="hover:text-fg transition-colors duration-200">Terms</a></li>
            <li><a href="#" className="hover:text-fg transition-colors duration-200">Cookies</a></li>
          </ul>
        </motion.div>
      </div>
      <div className="border-t border-line h-auto sm:h-12 flex flex-col sm:flex-row items-center justify-center px-5 sm:px-8 py-3 sm:py-0 gap-2 sm:gap-0 text-[12px] sm:text-[14px] text-fg-muted font-mono">
        <span>&copy; 2025 Stake Pesa</span>
      </div>
    </footer>
  );
}
