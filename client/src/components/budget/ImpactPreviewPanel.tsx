"use client"

import { Loader2 } from "lucide-react"
import { MetricDelta } from "./MetricDelta"

interface ImpactPreviewProps {
  isSimulating: boolean
  beforeMetrics?: {
    savingsRate: number
    investmentRate: number
    needsPercent: number
    wantsPercent: number
  }
  afterMetrics?: {
    newSavingsRate: number
    newInvestmentRate: number
    newNeedsPercent: number
    newWantsPercent: number
    savingsDelta: number
    investmentDelta: number
    needsDelta: number
    wantsDelta: number
    estimatedDifference: number
  }
}

export function ImpactPreviewPanel({
  isSimulating,
  beforeMetrics,
  afterMetrics
}: ImpactPreviewProps) {
  if (!afterMetrics) {
    return (
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
        <p className="text-xs font-medium text-blue-400 uppercase mb-2">Impact Preview</p>
        <p className="text-sm text-slate-400">
          Adjust category percentages to see real-time impact on your budget metrics.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-slate-400 uppercase">Impact Preview</h4>
        {isSimulating && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-green-400" />
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <MetricDelta
          label="Savings Rate"
          beforeValue={beforeMetrics?.savingsRate || 0}
          afterValue={afterMetrics.newSavingsRate}
          format={(val) => val.toFixed(1)}
          isPercentage={true}
        />

        <MetricDelta
          label="Investment Rate"
          beforeValue={beforeMetrics?.investmentRate || 0}
          afterValue={afterMetrics.newInvestmentRate}
          format={(val) => val.toFixed(1)}
          isPercentage={true}
        />

        <MetricDelta
          label="Needs Allocation"
          beforeValue={beforeMetrics?.needsPercent || 0}
          afterValue={afterMetrics.newNeedsPercent}
          format={(val) => val.toFixed(1)}
          isPercentage={true}
        />

        <MetricDelta
          label="Wants Allocation"
          beforeValue={beforeMetrics?.wantsPercent || 0}
          afterValue={afterMetrics.newWantsPercent}
          format={(val) => val.toFixed(1)}
          isPercentage={true}
        />
      </div>

      {afterMetrics.estimatedDifference !== 0 && (
        <div className={`rounded-lg p-4 border ${
          afterMetrics.estimatedDifference > 0
            ? "bg-green-500/10 border-green-500/20"
            : "bg-orange-500/10 border-orange-500/20"
        }`}>
          <p className="text-xs font-medium text-slate-400 uppercase mb-1">
            Estimated Monthly Difference
          </p>
          <p className={`text-lg font-semibold ${
            afterMetrics.estimatedDifference > 0
              ? "text-green-400"
              : "text-orange-400"
          }`}>
            {afterMetrics.estimatedDifference > 0 ? "+" : ""}
            ₹{Math.abs(afterMetrics.estimatedDifference).toLocaleString("en-IN")}
          </p>
        </div>
      )}
    </div>
  )
}
