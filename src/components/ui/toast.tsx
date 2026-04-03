"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Types ── */
type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  desc?: string;
}

interface ToastCtx {
  toast: (type: ToastType, title: string, desc?: string) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(Ctx);

let _id = 0;

const typeConfig: Record<ToastType, { icon: string; color: string; bg: string; border: string }> = {
  success: {
    icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "text-green",
    bg: "bg-green/5",
    border: "border-green/20",
  },
  error: {
    icon: "M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "text-red",
    bg: "bg-red/5",
    border: "border-red/20",
  },
  info: {
    icon: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
    color: "text-fg-secondary",
    bg: "bg-bg-above",
    border: "border-line",
  },
  warning: {
    icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
    color: "text-amber",
    bg: "bg-amber/5",
    border: "border-amber/20",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, title: string, desc?: string) => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, type, title, desc }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <Ctx.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-100 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const cfg = typeConfig[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => dismiss(t.id)}
                className={`pointer-events-auto cursor-pointer flex items-start gap-2.5 p-3 rounded-lg border backdrop-blur-md shadow-lg ${cfg.bg} ${cfg.border}`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5`}>
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
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-fg">{t.title}</p>
                  {t.desc && (
                    <p className="text-[12px] text-fg-muted mt-0.5">{t.desc}</p>
                  )}
                </div>
                {/* progress bar */}
                <motion.div
                  className={`absolute bottom-0 left-0 h-0.5 rounded-b-lg ${cfg.color.replace("text-", "bg-")}`}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 3.5, ease: "linear" }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
