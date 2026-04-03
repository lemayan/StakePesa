"use client";

import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Sparkline } from "@/components/ui/sparkline";

const stats = [
  {
    label: "Total Volume",
    value: 12800000,
    display: "KES 12.8M",
    prefix: "KES ",
    suffix: "M",
    target: 12.8,
    decimals: 1,
    spark: [2, 3.1, 4.5, 5.2, 6.8, 7.5, 9.1, 10, 11.2, 12.8],
    color: "#22c55e",
  },
  {
    label: "Markets Created",
    value: 23450,
    prefix: "",
    suffix: "",
    target: 23450,
    decimals: 0,
    spark: [800, 2100, 5400, 8200, 11000, 14500, 17200, 19800, 21500, 23450],
    color: "#22c55e",
  },
  {
    label: "Settlement Rate",
    prefix: "",
    suffix: "%",
    target: 99.2,
    decimals: 1,
    spark: [95, 96.5, 97, 97.8, 98.1, 98.5, 98.9, 99, 99.1, 99.2],
    color: "#22c55e",
  },
  {
    label: "Avg Payout Speed",
    prefix: "<",
    suffix: "min",
    target: 2,
    decimals: 0,
    spark: [8, 6, 5, 4, 3.5, 3, 2.5, 2.2, 2, 1.8],
    color: "#f59e0b",
  },
];

export function StatsBar() {
  return (
    <section className="border-t border-line">
      <div className="grid grid-cols-2 md:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className={`p-4 sm:p-6 ${i > 0 ? "sm:border-l border-line" : ""} ${i >= 2 ? "border-t sm:border-t-0" : ""} ${i === 1 ? "border-l border-line" : ""} ${i === 3 ? "border-l border-line" : ""} group hover:bg-bg-above/50 transition-colors duration-300`}
          >
            <div className="flex items-end justify-between gap-2 sm:gap-3">
              <div>
                <AnimatedCounter
                  target={s.target}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  decimals={s.decimals}
                  className="font-mono text-[22px] sm:text-[32px] font-bold tracking-tight tabular-nums"
                />
                <p className="text-[11px] sm:text-[14px] font-mono text-fg-muted uppercase tracking-wider mt-1 sm:mt-1.5">
                  {s.label}
                </p>
              </div>
              <div className="w-16 sm:w-20 opacity-40 group-hover:opacity-80 transition-opacity duration-300">
                <Sparkline data={s.spark} color={s.color} height={32} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
