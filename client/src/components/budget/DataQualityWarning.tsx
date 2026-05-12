"use client"

import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react"

interface DataQualityWarningProps {
  quality: "high" | "moderate" | "low" | "insufficient"
  transactionCount: number
}

export function DataQualityWarning({ quality, transactionCount }: DataQualityWarningProps) {
  if (quality === "high") {
    return null // No warning needed for high quality
  }

  if (quality === "insufficient") {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
          <div className="flex-1">
            <h4 className="font-semibold text-red-300">Insufficient Data</h4>
            <p className="mt-1 text-sm text-red-300/80">
              Only {transactionCount} transaction
              {transactionCount !== 1 ? "s" : ""} found. The auto-generated budget may not be accurate.
            </p>
            <p className="mt-2 text-sm text-red-300/70">
              💡 For better results, import more historical data (ideally 3+ months)
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (quality === "low") {
    return (
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-400" />
          <div className="flex-1">
            <h4 className="font-semibold text-orange-300">Limited Data</h4>
            <p className="mt-1 text-sm text-orange-300/80">
              Only {transactionCount} transactions found. Results are approximate and may vary.
            </p>
            <p className="mt-2 text-sm text-orange-300/70">
              💡 Upload older bank statements to improve accuracy
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (quality === "moderate") {
    return (
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-300">Moderate Data Quality</h4>
            <p className="mt-1 text-sm text-blue-300/80">
              {transactionCount} transactions analyzed. Results are reasonably accurate.
            </p>
            <p className="mt-2 text-sm text-blue-300/70">
              💡 You can adjust these figures based on your expected spending
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
