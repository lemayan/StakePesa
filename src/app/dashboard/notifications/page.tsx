"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Types ── */
type NotiType = "win" | "loss" | "deposit" | "withdraw" | "market" | "referral" | "system";

interface Notification {
  id: number;
  type: NotiType;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  amount?: string;
}

/* ── Mock data ── */
const initialNotifications: Notification[] = [
  { id: 1, type: "win", title: "You won!", desc: "No sugar for 3 days — challenge completed", time: "2h", read: false, amount: "+2,000 KES" },
  { id: 2, type: "deposit", title: "Deposit received", desc: "Paystack deposit confirmed", time: "5h", read: false, amount: "+1,000 KES" },
  { id: 3, type: "market", title: "Market ending soon", desc: "Arsenal vs City prediction closes in 24h", time: "8h", read: false },
  { id: 4, type: "referral", title: "New referral", desc: "Sarah N. signed up with your link", time: "1d", read: true },
  { id: 5, type: "loss", title: "Market resolved", desc: "BTC above $80k — resolved NO", time: "2d", read: true, amount: "-500 KES" },
  { id: 6, type: "withdraw", title: "Withdrawal processed", desc: "Bank transfer completed", time: "3d", read: true, amount: "-3,000 KES" },
  { id: 7, type: "win", title: "You won!", desc: "Morning run streak — 7 day challenge completed", time: "5d", read: true, amount: "+4,200 KES" },
  { id: 8, type: "system", title: "Welcome to Stake Pesa", desc: "Your account has been set up. Start exploring markets!", time: "7d", read: true },
];

const typeConfig: Record<NotiType, { icon: string; color: string; bg: string }> = {
  win: {
    icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "text-green",
    bg: "bg-green/10",
  },
  loss: {
    icon: "M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "text-red",
    bg: "bg-red/10",
  },
  deposit: {
    icon: "M12 4.5v15m7.5-7.5h-15",
    color: "text-fg-secondary",
    bg: "bg-bg-above",
  },
  withdraw: {
    icon: "M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75",
    color: "text-fg-muted",
    bg: "bg-bg-above",
  },
  market: {
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z",
    color: "text-amber",
    bg: "bg-amber/10",
  },
  referral: {
    icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
    color: "text-green",
    bg: "bg-green/10",
  },
  system: {
    icon: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
    color: "text-fg-muted",
    bg: "bg-bg-above",
  },
};

const filters = ["All", "Wins", "Transactions", "Markets", "System"] as const;
type Filter = (typeof filters)[number];

const filterMap: Record<Filter, NotiType[]> = {
  All: [],
  Wins: ["win", "loss"],
  Transactions: ["deposit", "withdraw"],
  Markets: ["market"],
  System: ["system", "referral"],
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<Filter>("All");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter(
    (n) => filter === "All" || filterMap[filter].includes(n.type)
  );

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <div className="max-w-3xl space-y-5">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <h1 className="text-[16px] font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-[11px] font-mono font-bold text-white bg-green rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-[12px] font-mono text-green hover:underline"
          >
            Mark all read
          </button>
        )}
      </motion.div>

      {/* ── Filters ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1"
      >
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`relative h-8 px-3 text-[13px] font-mono whitespace-nowrap rounded-md transition-all ${
              filter === f
                ? "text-green font-semibold"
                : "text-fg-muted hover:text-fg-secondary hover:bg-bg-above"
            }`}
          >
            {filter === f && (
              <motion.div
                layoutId="noti-filter"
                className="absolute inset-0 bg-green/8 rounded-md border border-green/15"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative">{f}</span>
          </button>
        ))}
      </motion.div>

      {/* ── List ── */}
      <div className="border border-line rounded-lg overflow-hidden">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center text-[14px] text-fg-muted"
            >
              No notifications
            </motion.div>
          ) : (
            filtered.map((n, i) => {
              const cfg = typeConfig[n.type];
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  onClick={() => markRead(n.id)}
                  className={`flex items-start gap-3 px-3 py-3 border-b border-line last:border-b-0 cursor-pointer transition-colors hover:bg-bg-above/40 ${
                    !n.read ? "bg-green/[0.02]" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                    <svg
                      className={`w-4 h-4 ${cfg.color}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[14px] font-medium ${!n.read ? "text-fg" : "text-fg-secondary"}`}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 bg-green rounded-full shrink-0" />
                      )}
                    </div>
                    <p className="text-[13px] text-fg-muted mt-0.5 truncate">{n.desc}</p>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[11px] font-mono text-fg-muted">{n.time}</span>
                    {n.amount && (
                      <span className={`text-[13px] font-mono font-semibold mt-0.5 ${
                        n.amount.startsWith("+") ? "text-green" : "text-red"
                      }`}>
                        {n.amount}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
