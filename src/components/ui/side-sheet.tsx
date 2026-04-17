"use client"

import { ReactNode, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

interface SideSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
}

export function SideSheet({ isOpen, onClose, title, description, children }: SideSheetProps) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  if (!mounted) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: "100%", filter: "blur(8px)" }}
            animate={{ x: 0, filter: "blur(0px)" }}
            exit={{ x: "100%", filter: "blur(8px)" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-line bg-bg/95 shadow-2xl backdrop-blur-xl md:w-[600px]"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div>
                <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-fg-muted transition hover:bg-bg-above hover:text-fg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
