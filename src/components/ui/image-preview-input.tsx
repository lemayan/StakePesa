"use client"

import { useState } from "react"
import { Image as ImageIcon, Link as LinkIcon, CheckCircle2 } from "lucide-react"

interface ImagePreviewInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ImagePreviewInput({ value, onChange, placeholder = "https://example.com/image.jpg" }: ImagePreviewInputProps) {
  const [isValid, setIsValid] = useState<boolean | null>(value ? true : null)

  return (
    <div className="group relative overflow-hidden rounded-md border border-line bg-bg transition focus-within:border-green">
      <div className="relative z-10 flex items-center gap-2 border-b border-line bg-bg px-2 py-1">
        <LinkIcon className="h-4 w-4 text-fg-muted ml-2" />
        <input
          type="url"
          value={value}
          onChange={(e) => {
            const val = e.target.value
            onChange(val)
            if (!val) setIsValid(null)
          }}
          placeholder={placeholder}
          className="h-9 w-full bg-transparent px-2 text-sm outline-none placeholder:text-fg-muted/50"
        />
        {isValid && value && <CheckCircle2 className="mr-2 h-4 w-4 text-green" />}
      </div>

      <div className="relative flex aspect-video w-full items-center justify-center bg-bg-above/30">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Preview"
            onLoad={() => setIsValid(true)}
            onError={() => setIsValid(false)}
            className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-fg-muted/50">
            <ImageIcon className="mb-2 h-8 w-8 opacity-50" />
            <span className="text-xs font-mono">Image Preview</span>
          </div>
        )}
        
        {isValid === false && value && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
            <span className="rounded-full bg-red/10 px-3 py-1 text-xs font-semibold text-red">Invalid Image URL</span>
          </div>
        )}
      </div>
    </div>
  )
}
