"use client";

import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("ck")) {
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-bg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-[12px] text-fg-secondary">
        We use cookies for analytics and to improve your experience.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => {
            localStorage.setItem("ck", "1");
            setShow(false);
          }}
          className="h-7 px-3 text-[11px] font-medium bg-fg text-bg hover:opacity-90 transition-opacity"
        >
          Accept
        </button>
        <button
          onClick={() => setShow(false)}
          className="h-7 px-3 text-[11px] text-fg-muted hover:text-fg transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
