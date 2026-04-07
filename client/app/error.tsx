"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    toast.error(error.message || "Something went wrong")
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] p-6 text-center">
      <div className="max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#0F172A] p-6">
        <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
        <p className="text-sm text-slate-400">A page error occurred. The details were sent as a toast.</p>
        <button
          onClick={reset}
          className="rounded-xl bg-[#22C55E] px-4 py-2 text-sm font-semibold text-[#020617]"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
